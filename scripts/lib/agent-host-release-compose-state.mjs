// Both ESM transports and the CommonJS server use one synchronous pure engine.
import state from './agent-host-release-compose-state.cjs';

export const { composeControllerPolicySchema, composeServiceDeclarationSchema, composeConfigurationSchema, composeRuntimeServiceSchema,
  composeRuntimeSchema, composeRuntimeBindingSchema, composeConfigurationDigest, composeRuntimeSetDigest,
  qualifyComposeRuntime, qualifyComposeRetainedBaseline } = state;
