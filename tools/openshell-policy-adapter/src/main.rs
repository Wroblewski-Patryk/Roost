//! Bounded adapter over unmodified official functions, not a runtime simulator.
use std::io::{Read, Write};
use openshell_policy::{PolicyMergeOp, compose_effective_policy, merge_policy,
    parse_sandbox_policy, sandbox_policy_to_json_value, validate_sandbox_policy};
use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    operation: String,
    policy: String,
    #[serde(default)]
    base: Option<String>,
}

fn guarded_text(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    !text.is_empty() && text.len() <= 8192 && text.is_ascii()
        && !["private key", "password", "bearer ", "github_pat_", "api_key", "secret", "token="]
            .iter().any(|marker| lower.contains(marker))
}

fn evaluate(raw: &[u8]) -> Result<Value, &'static str> {
    if raw.len() > 32768 { return Err("input_limit"); }
    let input: Input = serde_json::from_slice(raw).map_err(|_| "envelope_invalid")?;
    if !guarded_text(&input.policy) || input.base.as_ref().is_some_and(|v| !guarded_text(v)) {
        return Err("policy_input_limit_or_marker");
    }
    let candidate = parse_sandbox_policy(&input.policy).map_err(|_| "parse_failure")?;
    validate_sandbox_policy(&candidate).map_err(|_| "validation_failure")?;
    let effective = match input.operation.as_str() {
        // This is official provider-free composition of the explicit source.
        // Supervisor path enrichment is intentionally NOT reproduced here.
        "replace" if input.base.is_none() => compose_effective_policy(&candidate, &[]),
        "merge" => {
            let base_text = input.base.as_deref().ok_or("base_required")?;
            let base = parse_sandbox_policy(base_text).map_err(|_| "base_parse_failure")?;
            validate_sandbox_policy(&base).map_err(|_| "base_validation_failure")?;
            if candidate.network_policies.len() > 8 { return Err("operation_limit"); }
            let operations: Vec<_> = candidate.network_policies.into_iter()
                .map(|(rule_name, rule)| PolicyMergeOp::AddRule { rule_name, rule }).collect();
            let merged = merge_policy(base, &operations).map_err(|_| "merge_failure")?;
            compose_effective_policy(&merged.policy, &[])
        },
        _ => return Err("operation_invalid"),
    };
    validate_sandbox_policy(&effective).map_err(|_| "effective_validation_failure")?;
    let projection = sandbox_policy_to_json_value(&effective).map_err(|_| "projection_failure")?;
    Ok(json!({"code":"upstream_valid", "operation":input.operation,
        "upstreamCommit":"d1155aa70042d3e2ee49dbfa15346b108b7c1d92",
        "projection":projection, "scope":"source-policy-composition-only",
        "runtimePolicyEvaluated":false, "liveAdmissionAllowed":false}))
}

fn main() {
    std::panic::set_hook(Box::new(|_| {}));
    let mut raw = Vec::new();
    let result = if std::io::stdin().take(32769).read_to_end(&mut raw).is_err() {
        Err("input_unreadable")
    } else {
        std::panic::catch_unwind(|| evaluate(&raw)).unwrap_or(Err("upstream_panic"))
    };
    let (value, status) = match result {
        Ok(value) => (value, 0),
        Err(code) => (json!({"code":code,"liveAdmissionAllowed":false}), 2),
    };
    let output = serde_json::to_vec(&value).unwrap_or_default();
    if output.is_empty() || output.len() > 16384 {
        let _ = std::io::stdout().write_all(b"{\"code\":\"output_limit\",\"liveAdmissionAllowed\":false}");
        std::process::exit(2);
    }
    if std::io::stdout().write_all(&output).is_err() { std::process::exit(2); }
    std::process::exit(status);
}
