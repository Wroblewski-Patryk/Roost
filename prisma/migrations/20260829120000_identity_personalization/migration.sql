ALTER TABLE "users"
ADD COLUMN "avatar" TEXT;

ALTER TABLE "workspaces"
ADD COLUMN "logo" TEXT,
ADD COLUMN "accent_color" TEXT;
