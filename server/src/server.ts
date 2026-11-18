import app from './app';
import { demoMode, getJwtSecret } from './utils/config';

getJwtSecret();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || (demoMode ? '127.0.0.1' : '0.0.0.0');

app.listen(PORT, HOST, () => {
  console.log('Smart Contract Invoice Intelligence API listening at http://' + HOST + ':' + PORT);
});
