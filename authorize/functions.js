const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

function authorizeUser(request, response, next) {
  if (request.body.token == null) {
    console.log('token is undefined');
    return response.status(401).send();
  }
  const jwk = {
    keys: [
      {
        alg: 'RS256',
        e: 'AQAB',
        kid: 'NTXkDOLRTAwSuAL9lZdP6pkJQQKmkyI6QqEvrTwR0W8=',
        kty: 'RSA',
        n:
          '9ZBottyhkLCLzRxT4gbg6nDZjDYqDGS2QKxJOOOn4GVpdQKKnLhGQL6suDiiabsi6a30VO_jyNxO4cwU1rS3Zj3Zn_yCl6EHTEYSB0bYYGexyL0fDk4xD9IWYuRCRwleguiYtvLGWxXJpgES6M5T_OIr9FrbJqhbOTVfiQZA52vPhYeAVhBJ8rEnndxfH5Q7KEXbUXANo6ugvnHbPajeCM1GopdXsDxM_EEU5-xH53buejTtdlLNPfsiP26Trb6tLQ7KcSmWTqPo5yOWVlBDV39JHD3N1vKZMC7kEV3Smdvfk5KLGBtn-rP9PcbOVipOqkEIrwHdI7N-UVduwZnP-w',
        use: 'sig',
      },
      {
        alg: 'RS256',
        e: 'AQAB',
        kid: 'xNFt3jSra1tIZXXr7CbKH8AlfpJK5giGYitfaJmP89Y=',
        kty: 'RSA',
        n:
          'm1d9KpOH4vSEJXEt4856R19lTMd1FLiL-ovvFkk_XGfLawkFBgsS84Aen0KKwXUJwwhHHTQBR1ml5KqMhgztbi5myhhKC84cvklaMBMRqFZaIx45JBHa6cvVepubRYZcvkS2pws_4cozbOiNjVYwBPVqi3dVjlwDPpAV8Xpj90F70GuXsQ0tu_nVkEqGwPsSDaVJuqNiUYpWDFVg-jSlOocQJ1TNGuxkDu8-BgGQ_nV5OBjNvEFIFCP3_JKLFitFXth1iDycZHBrcVlUcdfM0uqBhLgW7WWN_doh4AyCsJMOdP4j1TYOyYInDePwPasBht4dzH0fZdRUcXz2so5a1Q',
        use: 'sig',
      },
    ],
  };

  const jwkForIdToken = jwk.keys[0];
  const pem = jwkToPem(jwkForIdToken);
  try {
    jwt.verify(request.body.token, pem, (error, decodedToken) => {
      if (error) {
        console.log(error);
        return response.status(403).send(error);
      }
      console.log('decoded token', decodedToken);
      request.decodedToken = decodedToken;
      next();
    });
  } catch (error) {
    return response.status(500).send(error);
  }
}

module.exports = authorizeUser;
