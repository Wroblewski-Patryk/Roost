import React from "react";

import { CcButton } from "./cc-button";
import { CcNotice } from "./cc-notice";
import { clearRouteAssetRecovery, recoverRouteAsset } from "../route-recovery";

type CcRouteBoundaryProps = {
  children: React.ReactNode;
  detail: string;
  retryLabel: string;
  title: string;
};

type CcRouteBoundaryState = {
  failed: boolean;
};

export class CcRouteBoundary extends React.Component<CcRouteBoundaryProps, CcRouteBoundaryState> {
  state: CcRouteBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    recoverRouteAsset(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section className="roost-work-surface grid min-h-56 place-items-center rounded-company p-6">
        <div className="w-full max-w-xl">
          <CcNotice
            action={<CcButton iconLeft="ph-arrow-clockwise" onClick={() => { clearRouteAssetRecovery(); window.location.reload(); }} variant="primary">{this.props.retryLabel}</CcButton>}
            detail={this.props.detail}
            live
            title={this.props.title}
            tone="error"
          />
        </div>
      </section>
    );
  }
}
