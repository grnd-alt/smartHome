import express,{Express} from "express"
import crypto from 'crypto'
import qs from 'qs';
import dotenv from 'dotenv'
const app:Express = express();
dotenv.config()

const port = process.env.PORT || 3000;


const config = {
  /* openapi host */
  host: 'https://openapi.tuyaeu.com',  
  /* fetch from openapi platform */
  accessKey: process.env.ACCESS_KEY!,
  /* fetch from openapi platform */
  secretKey: process.env.SECRET_KEY!,
};



/**
 * request sign, save headers 
 * @param path
 * @param method
 * @param headers
 * @param query
 * @param body
 */
async function getRequestSign(
  token: string,
  path: string,
  method: string,
  headers: { [k: string]: string } = {},
  query: { [k: string]: any } = {},
  body: { [k: string]: any } = {},
) {
  const t = Date.now().toString();
  const [uri, pathQuery] = path.split('?');
  const queryMerged = Object.assign(query, qs.parse(pathQuery));
  const sortedQuery: { [k: string]: string } = {};
  Object.keys(queryMerged)
    .sort()
    .forEach((i) => (sortedQuery[i] = query[i]));

  const querystring = decodeURIComponent(qs.stringify(sortedQuery));
  const url = querystring ? `${uri}?${querystring}` : uri;
  const bodystring = JSON.stringify(body);
  let contentHash
  if (bodystring === JSON.stringify({})) contentHash = crypto.createHash('sha256').update('').digest('hex');
  else contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const stringToSign = [method, contentHash, '', url].join('\n');
  const signStr = config.accessKey + token + t + stringToSign;
  return {
    't':t,
    'path': url,
    'client_id': config.accessKey,
    'sign': await encryptStr(signStr, config.secretKey),
    'sign_method': 'HMAC-SHA256',
    'access_token': token,
  };
}




/**
 * HMAC-SHA256 crypto function
 */
async function encryptStr(str: string, secret: string): Promise<string> {
  return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

/**
 * fetch highway login token
 */
async function getToken() {
  const method = 'GET';
  const timestamp = Date.now().toString();
  const signUrl = '/v1.0/token?grant_type=1';
  const contentHash = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = [method, contentHash, '', signUrl].join('\n');
  const signStr = config.accessKey + timestamp + stringToSign;

  const headers = {
    t: timestamp,
    sign_method: 'HMAC-SHA256',
    client_id: config.accessKey,
    sign: await encryptStr(signStr, config.secretKey),
  };
  const response = await (await fetch(config.host+ '/v1.0/token?grant_type=1', { headers })).json();
  return response['result']['access_token']
}



async function getDeviceState(deviceId:string,code:string) {
  const path = `/v1.0/iot-03/devices/${deviceId}/status`
  const url = config.host + path;

  const resp = await fetch(url,{method:'GET',headers:await getRequestSign(await getToken(),path,'GET')})
  console.log('asldjf')
  const result= (await resp.json())['result']
  for (let item of result) {
    if (item['code'] === code) {
      return item['value']
    }
  }
  return 0
}


/**
 * toggles supplied device ID
 */
app.get('/:deviceID/turn/:turn', async(req,res) => {
  const deviceId = req.params.deviceID;
  const turn:Boolean = req.params.turn === 'true';
  const path = `/v1.0/iot-03/devices/${deviceId}/commands`;

  const url = config.host + path;
  const body = {
    "commands": [
      {
        "code": "switch_1",
        "value": turn
      }
    ]
  }
  console.log(body)
  
  fetch(url,{method:'POST',
    headers: await getRequestSign(await getToken(),path,'POST',{},{},body),
    body: JSON.stringify(body)
  }).then(async response => {
      console.log(await getToken());
      console.log(url)
      let result = await response.json()
      res.send(result)
  })
})


/**
 * toggles supplied device ID
 */
app.get('/:deviceID/toggle', async(req,res) => {
  const deviceId = req.params.deviceID;
  const path = `/v1.0/iot-03/devices/${deviceId}/commands`;

  const url = config.host + path;
  const body = {
    "commands": [
      {
        "code": "switch_1",
        "value": !(await getDeviceState(deviceId,'switch_1'))
      }
    ]
  }
  console.log(body);
  
  fetch(url,{method:'POST',
    headers: await getRequestSign(await getToken(),path,'POST',{},{},body),
    body: JSON.stringify(body)
  }).then(async response => {
      console.log(await getToken());
      console.log(url)
      let result = await response.json()
      res.send(result)
  })
})

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
