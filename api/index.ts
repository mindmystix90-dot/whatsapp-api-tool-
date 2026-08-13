import app, { appReady } from '../server.js';

export default async function handler(req: any, res: any) {
  await appReady;
  return app(req, res);
}
