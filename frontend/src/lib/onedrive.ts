import fs from 'fs';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

const clientId = process.env.CLIENT_ID!;
const clientSecret = process.env.CLIENT_SECRET!;
const tenantId = process.env.TENANT_ID!;
const userEmail = process.env.USER_EMAIL!;
const driveFolder = 'photos';

export async function getAccessToken() {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to retrieve access token');
  }
  return data.access_token;
}

export async function uploadToOneDrive(file: { buffer: Buffer; originalname: string }, propertyId: string, key: string) {
  const token = await getAccessToken();

  const client = Client.init({
    authProvider: (done) => done(null, token),
  });

  const driveData = await client.api(`/users/${userEmail}/drive`).get();
  const driveId = driveData.id;

  const {buffer} = file; 
  const filename = file.originalname;

  const uploadPath = `/${driveFolder}/${propertyId}/${filename}`;

  const uploadResponse = await client
    .api(`/drives/${driveId}/root:${uploadPath}:/content`)
    .put(buffer);

  return uploadResponse.webUrl;
}

