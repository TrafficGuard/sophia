const fs = require('fs');
const path = require('path');

function generateEnvironmentFile() {
    const envVars = {
        version: process.env.npm_package_version,
        serverUrl: process.env.SERVER_URL,
        gcloudProject: process.env.GCLOUD_PROJECT,
        firestoreDatabase: process.env.FIRESTORE_DATABASE,
        auth: process.env.AUTH
    };

    const environmentFile = `// This file is auto-generated by ${__filename}
export const env = ${JSON.stringify(envVars, null, 2)};
`;

    const targetPath = path.join(__dirname, '../src/environments/.env.ts');

    try {
        fs.writeFileSync(targetPath, environmentFile);
        console.log(`Environment file generated successfully at ${targetPath}`);
    } catch (error) {
        console.error('Error generating environment file:', error);
        process.exit(1);
    }
}

generateEnvironmentFile();