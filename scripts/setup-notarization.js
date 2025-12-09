import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Electron-builder 26.0.12 expects notarize to be a boolean and reads from env vars
// It expects: APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER
if (process.env.APPLE_API_KEY_PATH) {
  // Set notarize to true (boolean)
  packageJson.build.mac.notarize = true;
  
  // Set environment variables with names electron-builder expects
  // Read the API key file content (handle relative paths)
  const apiKeyPath = path.isAbsolute(process.env.APPLE_API_KEY_PATH)
    ? process.env.APPLE_API_KEY_PATH
    : path.join(__dirname, '..', process.env.APPLE_API_KEY_PATH);
  const apiKeyContent = fs.readFileSync(apiKeyPath, 'utf8');
  
  process.env.APPLE_API_KEY = apiKeyContent;
  process.env.APPLE_API_KEY_ID = process.env.APPLE_API_KEY_ID;
  process.env.APPLE_API_ISSUER = process.env.APPLE_API_ISSUER_ID;
} else {
  // Remove notarize if env vars not set
  delete packageJson.build.mac.notarize;
}

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Get the command from process.argv (everything after this script)
const command = process.argv.slice(2).join(' ');

if (command) {
  // Run electron-builder with the env vars
  execSync(command, { 
    stdio: 'inherit',
    env: process.env
  });
}

