import { env } from "./config/env";
import { createApp } from "./app";
import { startClickUpMaintenanceScheduler } from "./integrations/clickup/clickup.maintenance-scheduler";

const app = createApp();

app.listen(env.port, () => {
  console.log(`companycore listening on port ${env.port}`);
  startClickUpMaintenanceScheduler();
});
