import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { env } from "../env";

const requiredVariables = [];
const recommendedVariables = ["CENSYS_ID", "CENSYS_SECRET"];

for (const variable of requiredVariables) {
    if (!env[variable]) {
        throw new Error(colors.red(`Missing required environment variable ${variable}`));
    }
}

for (const variable of recommendedVariables) {
    if (!env[variable]) {
        console.log(colors.yellow(`WARNING: Enviornment variable ${variable} not found.`));
    }
}
