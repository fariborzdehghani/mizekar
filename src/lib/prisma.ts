import "dotenv/config";
import "server-only";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@/generated/prisma/client";
import {
  readBooleanEnv,
  readPositiveIntegerEnv,
  readRequiredEnv,
} from "@/src/lib/env";

const sqlConfig = {
  user: readRequiredEnv("DB_USER"),
  password: readRequiredEnv("DB_PASSWORD"),
  database: readRequiredEnv("DB_NAME"),
  server: readRequiredEnv("HOST"),
  port: readPositiveIntegerEnv("DB_PORT"),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: readBooleanEnv("DB_ENCRYPT", true),
    trustServerCertificate: readBooleanEnv("DB_TRUST_SERVER_CERTIFICATE", true),
  },
};

const adapter = new PrismaMssql(sqlConfig);
const prisma = new PrismaClient({ adapter });

export { prisma };
