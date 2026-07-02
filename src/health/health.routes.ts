import { Router } from "express";
import { env } from "../config/env";

export const healthRouter = Router();
export const readinessRouter = Router();
export const buildInfoRouter = Router();

function publicRuntimeInfo() {
  return {
    status: "ok",
    service: "companycore",
    name: "LuckySparrow Company Core",
    build: {
      commit: env.buildCommit,
      image: env.buildImage
    }
  };
}

healthRouter.get("/", (_req, res) => {
  res.json(publicRuntimeInfo());
});

readinessRouter.get("/", (_req, res) => {
  res.json(publicRuntimeInfo());
});

buildInfoRouter.get("/", (_req, res) => {
  res.json(publicRuntimeInfo());
});
