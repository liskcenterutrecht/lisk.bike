const net = require('net');
const util = require('./concox-bl10-util')
const crc16 = require('crc16-itu')
const dateFormat = require('dateformat');
const fs = require('fs');

const transactions = require('@liskhq/lisk-transactions');

const UpdateBikeLocationTransaction = require('../app/imports/api/lisk-blockchain/transactions/update-bike-location');

// helper functions
const prefix = (text, prefix) => {
  return text.split("\n").map((line)=>{ return prefix + line}).join("\n");
}

const { EPOCH_TIME } = require('@liskhq/lisk-constants');

// Function that generates timestamp
const getTimestamp = () => {
  const millisSinceEpoc = Date.now() - Date.parse(EPOCH_TIME);
  const inSeconds = ((millisSinceEpoc) / 1000).toFixed(0);
  return  parseInt(inSeconds);
};


// blockchain functions
const updateBikeLocation = async (client, bikeaccount, latitude, longitude) => {
  console.log("doing update bike location transaction on the blockchain")
  // find the bike info on the blockchain
  let account = undefined;
  let accountlist = await client.accounts.get({address:bikeaccount.address});
  if(accountlist.data.length==1) {
    account = accountlist.data[0];
  } else {
    console.log("bike account not found. Please try again");
    return false;
  }
  
  let asset = {
      id: bikeaccount.address,
  }
  
  let prevlatitude = account.asset.location ? account.asset.location.latitude : 0;
  let prevlongitude = account.asset.location ? account.asset.location.longitude : 0;
    
  asset.location = {longitude,latitude};
  asset.prevlocation = {prevlongitude, prevlatitude};

  const tx = new UpdateBikeLocationTransaction({
    asset,
    senderPublicKey: bikeaccount.publicKey,
    recipientId: bikeaccount.address,
    timestamp: getTimestamp() // dateToLiskEpochTimestamp(new Date()),
  });

  tx.sign(bikeaccount.passphrase);

  return await client.transactions.broadcast(tx.toJSON());
}


// experimental code for Concox BL10 lock socket server
// parse code borrowed from https://gitlab.com/elyez/concox

let bl10 = {};
let themeteorserver = undefined;
let theapiclient = undefined;
let bikeapiserver = undefined;

bl10.startBikeApiServer = (meteorserver, apiclient, port = 3005, serverip = '0.0.0.0') => {
  themeteorserver = meteorserver;
  theapiclient = apiclient;
  bikeapiserver = net.createServer(function(socket) {
    // console.log('incoming bicycle connection from %s',  socket.remoteAddress);
    socket.tsconnect = new Date();
    
    socket.on('data', function(data) {
      fs.appendFile('received-commands.txt', data.toString('hex')+"\n", function (err) {
        if (err) throw err;
      });
      socket.tsreceived = new Date();
  		console.log('+++incoming data from %s / %s - %s', socket.remoteAddress, socket.id, socket.tsreceived && socket.tsreceived.toLocaleString());
      const buf = data.toString('hex');
      const cmdSplit = buf.split(/(?=7878|7979)/gi)
      cmdSplit.map( buf => {
        bl10.processSinglePacket(socket, buf);
      });
    });
  	
    // if(false==resetsent) {
    //   console.log("send command");
    //   // socket.write(bl10.createSendCommand('GPRSSET#'))
    //   // bikeapiserver:1,app.lisk.bike,9020,0
    //   // socket.write(bl10.createSendCommand('bikeapiserver,1,app.lisk.bike/api/liskbike,80,0#'))
  	// 	// socket.write(bl10.createSendCommand('UNLOCK#'))
    //   resetsent=true;
    // }

  	// socket.write('Echo bikeapiserver\r\n');
  	// socket.pipe(socket);

    socket.on('error', function(data) {
      console.log("socket %s - error %o",socket.id, data);
    })
  });
  
  console.log('starting concox BL10 bike api server on %s:%s', serverip, port);
  bikeapiserver.listen(port, serverip);
}

// createSendCommand()
//
// For documentation, see:
// 'BL10 GPS tracker communication protocolV1.0.8  20180408.pdf'
bl10.createSendCommand = (command) => {
  let messageCount = 1;

  const startBit = new Buffer([0x78, 0x78]);
  const protocolNumber = new Buffer([0x80]);
  // Information on content
  const commandContent = Buffer.from(command, 'ascii');
  const serverFlagBit = new Buffer([0x00, 0x00, 0x00, 0x00]);
  const lengthOfCommand = new Buffer([serverFlagBit.length + commandContent.length]);// serverFlagBit + command content length
  const language = new Buffer([0x02]);// English
  //
  const informationSerialNumber = new Buffer([0x00, messageCount]);

  const lengthOfDataBit = new Buffer([
    protocolNumber.length
    + Buffer.concat([
      new Buffer([lengthOfCommand.length]),
      serverFlagBit,
      commandContent,
      // language
    ]).length
    + informationSerialNumber.length
    + 2// errorCheck = 2 bytes
  ])

  const hexstring = crc16(
    new Buffer.concat([
      lengthOfDataBit,
      protocolNumber,
      lengthOfCommand,
      serverFlagBit,
      commandContent,
      // language,
      informationSerialNumber
    ])
  ).toString(16);

  const errorCheck = new Buffer(hexstring, 'hex');
  const stopBit = new Buffer([0x0D, 0x0A]);

  return new Buffer.concat([
    startBit,
    lengthOfDataBit,
    protocolNumber,
    lengthOfCommand,
    serverFlagBit,
    commandContent,
    // language,
    informationSerialNumber,
    errorCheck,
    stopBit
  ])

}

bl10.getBlockchainAsset = async(address, showdetails=false) => {
    // Make connection to the blockchain
    
    // console.log("++++++++++++++++++++++++++++++++++++++++++++++");
    // console.log('fetching blockchain asset data for %s', address)

    // lookup this account
    let account, description='';
    let accountlist = await theapiclient.accounts.get({address});
    if(accountlist.data.length==1) {
      account = accountlist.data[0];
      // description = account.address + ' [' + transactions.utils.convertBeddowsToLSK(account.balance) + ' LSK]'
      // console.log(description);
      // if(showdetails) {
      //   console.log(prefix(JSON.stringify(account,0,2), "    "));
      // }
      
      return account;
    } else {
      description = address + ' - no account info available';
      console.log(description);
      return undefined;
    }
}

bl10.getLockInfo = async (id) => {
  const filterfunc = (object=>{return (object.lock.locktype=='concox-bl10') && (object.lock.lockid==id) })
  let theLocks = await themeteorserver.collection("objects").filter(filterfunc).fetch();
  let theLock=undefined;
  if(theLocks.length==1) theLock = theLocks[0];
  if(theLock!=undefined) {
    // console.log('found the lock! HURRAY HURRAY HURRAY! [%s / "%s"]', id, theLock.blockchain.title);
  } else {
    console.warn('incoming info from unknown lock %s', id);
  }
  
  return theLock;
}

bl10.processInfoContent = async (cmd, infocontent, serialNo, socket) => {
  // console.log("==== processing %s/%s", cmd, infocontent)
  if(cmd=='01') { // process login command -> should always come first
    // TODO: decode timezone info
    let imei = infocontent.substr(0,8*2);
    socket.id = imei;
  } else {
    if(!"id" in socket) {
      console.warn("received command on unnamed socket. Ignoring command");
      return; // should not happen!
    }
  }
  
  let lastts = dateFormat(new Date(), 'yymmddHHMMss', true);
  let lastserial =  serialNo;
  
  let lockAsset = undefined
  let theLock = await bl10.getLockInfo(socket.id);
  if(theLock!=undefined) {
    lockAsset = await bl10.getBlockchainAsset(theLock.blockchain.id);
    // console.log("!!! got blockchain info %o", lockAsset);
  }
  
  switch(cmd) {
    case '01':  // login packet
      let modelcode =  infocontent.substr(8*2,2*2);
      let timezone =  infocontent.substr(10*2,2*2); // TODO: decode timezone info
      
      // console.log("login from %s (model: %s / tz: %s)", cmdinfo.imei, cmdinfo.modelcode, cmdinfo.timezone);
      
      if (serialNo) {
        const utcdatetime = dateFormat(new Date(), 'yymmddHHMMss', true);
        let content = `01${utcdatetime}00${serialNo+1}`;
        content = util.decimalToHexString(content.length) + content;
        const crcCheck = crc16(content, 'hex').toString(16);
        let response = `7878${content}${'0000'.substr(0, 4 - crcCheck.length) + crcCheck}0D0A`
        let str = new Buffer(response, 'hex');
        // console.log('replying with ' + response);
        socket.write(str);
      }
      
      if(theLock) {
        await themeteorserver.call('bl10.reconnect', socket.id);
      }
      
      console.log("sending where command")
      socket.write(bl10.createSendCommand('WHERE#'));
      
      break;
    case '21': // online command response
      let info = {
        length: infocontent.substr(0*2,1),
        content: new Buffer(infocontent.substr(5*2), 'hex'),
      }
      console.log("command response from %s (length: %s) [%s]", socket.id, info.length, info.content);
      // console.log("source string: %s", new Buffer(infocontent, 'hex'));
      break;
    case '23': // heartbeat package
      let terminalinfo = util.hex2bin(infocontent.substr(0,1*2));
      let language = infocontent.substr(4*2,2*2);
      // TODO: decode language bits
      // console.log('language %s', language)

      let gsmstrength = 'unknown';
      switch(infocontent.substr(3*2,1*2)) {
        case '00': gsmstrength = 'no signal'; break;
        case '01': gsmstrength = 'extremely weak'; break;
        case '02': gsmstrength = 'very weak'; break;
        case '03': gsmstrength = 'good'; break;
        case '04': gsmstrength = 'strong'; break;
      }
      
      let hbtinfo = {
        lastdt: dateFormat(new Date(), 'yymmddHHMMss', true),
        locked: terminalinfo.substr(7,1)=='1',
        charging: terminalinfo.substr(5,1)=='1',
        gpspositioning: terminalinfo.substr(1,1)=='1',
        voltage: util.hex2int(infocontent.substr(1*2,2*2))/100,
        gsmstrength: gsmstrength
      }
      
      if(lockAsset!=undefined) {
        if(hbtinfo.locked==true) {
          if(lockAsset.rentedBy!='') {
            // send end of rent transaction
          } else {
            //
          }
        } else {
          if(lockAsset.rentedBy!='') {
            // send end of rent transaction
          }
        }
      } else {
        console.log("unable to compare lock state against the blockchain")
      }
      
      // if(theLock!=undefined) {
      //   console.log("%s sent hbtinfo %s", theLock.lock.lockid, JSON.stringify(hbtinfo,0,2));
      //   console.log("doing update for object theLock._id", theLock.lock.lockid, JSON.stringify(hbtinfo,0,2));
      //
      //   Objects.update({'lock.lockid' : theLock.lock.lockid, 'lock.locktype': 'concox-bl10'}, {$set: {
      //     'state.state': hbtinfo.locked==false? 'available': 'inuse',
      //     'state.timestamp': new Date(),
      //     'lock.timestamp': new Date(),
      //     'lock.locked': hbtinfo.locked,
      //     'lock.battery': hbtinfo.voltage,
      //     'lock.charging': hbtinfo.charging==true}
      //   });
      //
      //   // write lock state to blockchain if changed
      // }
  
      // console.log("heartbeat from %s (locked: %s / charging: %s / gpspositioning: %s / voltage: %s / gsm signal: %s)", socket.id, hbtinfo.locked, hbtinfo.charging, hbtinfo.gpspositioning, hbtinfo.voltage, hbtinfo.gsmstrength);
      
      if(theLock) {
        await themeteorserver.call('bl10.heartbeat', socket.id, hbtinfo);
      }
      
      break;
    case '32':  // normal location
    case '33':  // alarm location
      let infolength = util.hex2int(infocontent.substr(6*2,1*2));
      let gpsinfo = {
        gpstime   : util.toTime(infocontent.substr(0*2,2), infocontent.substr(1*2,2), infocontent.substr(2*2,2), infocontent.substr(3*2,2), infocontent.substr(4*2,2), infocontent.substr(5*2,2), 'hex'),
      }
      
      // console.log('baseinfo la/t %s %s',infocontent.substr(8*2,4*2), util.hex2int(infocontent.substr(8*2,4*2)));
      
      if(infolength==12) {
        gpsinfo = {
          gpstime   : util.toTime(infocontent.substr(0*2,2), infocontent.substr(1*2,2), infocontent.substr(2*2,2), infocontent.substr(3*2,2), infocontent.substr(4*2,2), infocontent.substr(5*2,2), 'hex'),
          infolength: util.hex2int(infocontent.substr(6*2,1*2)),
          unknown1 : infocontent.substr(7*2,1), // split byte @ 7x2 -> high nibble = ??? / low nibble = nsats for tracking
          satellitecount : util.hex2int(infocontent.substr(7*2+1,1)),
          latitude  : parseFloat(util.hex2int(infocontent.substr(8*2,4*2)) / 1800000),
          longitude : parseFloat(util.hex2int(infocontent.substr(12*2,4*2)) / 1800000),
          speed     : util.hex2int(infocontent.substr(16*2,1*2)),
          coursestatus : infocontent.substr(17*2,2*2),
          received  : new Date().toISOString(),
        }
        // TODO: decodeMBSL/MCC/MNC/CI/RSSI and rest
        
        // let status='unknown';
        // let data =
        // if(cmd=='32') {
        //   switch()
        // } else if(cmd=='33') {
        //
        // }
        if(gpsinfo.infolength>0) {
        // if(theLock!=undefined&&gpsinfo.infolength>0) {
        //   Objects.update(theLock._id, {$set: {
        //     'lock.lat_lng': [gpsinfo.latitude, gpsinfo.longitude],
        //     'lock.lat_lng_timestamp': new Date() }
        //   });
          console.log("update lock gps location to [%s, %s]",gpsinfo.latitude, gpsinfo.longitude)
          updateBikeLocation(theapiclient, theLock.wallet, gpsinfo.latitude, gpsinfo.longitude);
          
        }

        console.log("location from %s (%s)", socket.id, JSON.stringify(gpsinfo));
      } else {
        // console.log("empty location record from %s", socket.id);
      }
    
      break;
    default:
      console.log("unhandled command %s from %s (%s)", cmd, socket.id, infocontent)
      break;
    case '98':
      
      let moduleidx=1;
      let startidx=0;
      let itpinfo = {};
      while (startidx<infocontent.length) {
        let typehex=infocontent.substr(startidx*2,1*2);
        let moduletype='unknown'+moduleidx;
        switch(typehex) {
          case '00': moduletype='IMEI'; break;
          case '01': moduletype='IMSI'; break;
          case '02': moduletype='ICCID'; break;
          case '03': moduletype='ChipID'; break;
          case '04': moduletype='BluetoothMac'; break;
        }
        
        let modulelength=util.hex2int(infocontent.substr((startidx + 1)*2,2*2));
        if(modulelength>0) {
          // console.log('found entry of type %s of %s bytes', typehex, modulelength)
          let tmpstr=infocontent.substr((startidx + 3)*2, modulelength*2);
          itpinfo[moduletype]=tmpstr;
          let buffer = new Buffer(infocontent.substr((startidx + 3)*2, modulelength*2),'hex');
          // console.log("data: %s", buffer)
        }

        startidx+=3+modulelength;
        moduleidx+=1;
      }
    
      // console.log('information transmission %o', itpinfo);
      break;
  }

  if (serialNo) {
    // console.log('got serial number #%s', serialNo);
    
    const content = `05${cmd}${serialNo}`;
    const crcCheck = crc16(content, 'hex').toString(16);
    let response = `7878${content}${'0000'.substr(0, 4 - crcCheck.length) + crcCheck}0D0A`;
    let str = new Buffer(response, 'hex');
    socket.write(str);
    //console.log("sending %s", response)

    // if(parseInt(serialNo)%100==2) {
    //   // console.log("++++++++++asking for location+++++++++++++++++++++++++++++++++");
    //   // socket.write(bl10.createSendCommand('RESET#')); // reboot lock
    //   // socket.write(bl10.createSendCommand('PARAM#'));
    //   // socket.write(bl10.createSendCommand('LJDW#'));
    //   // socket.write(bl10.createSendCommand('WHERE#'));
    //   // socket.write(bl10.createSendCommand('GTIMER,3#'));
    //   // socket.write(bl10.createSendCommand('GPSON#'));
    //   // socket.write(bl10.createSendCommand('GTIMER#'));
    //   // socket.write(bl10.createSendCommand('LJDW#'));
    // }
    // if(parseInt(serialNo)%100==5) {
    //   socket.write(bl10.createSendCommand('LJDW#'));
    // }
    
  }
}

bl10.processSinglePacket = async (socket, buf) => {
  // console.log("incoming %s", buf.toString());
  
  let cmd = '';
  let length = 0;
  let infocontent = '';
  let serialNo = '';
  if (buf.substr(0,2*2)=='7878') {
    // size stored in 1 byte
    length = util.hex2int(buf.substr(2*2,1*2));
    cmd = buf.substr(3*2,1*2);
    infocontent = buf.substr(4*2, buf.length-11*2);
    serialNo = buf.substr(-6*2, 2*2);
  } else if(buf.substr(0,4)=='7979') {
    // size stored in 2 bytes
    length = util.hex2int(buf.substr(3*2,1*2));
    cmd = buf.substr(4*2,1*2);
    infocontent = buf.substr(5*2, buf.length-11*2);
    serialNo = buf.substr(-6*2, 2*2);
  } else {
    // don't know what to do. Don't reply
    serialNo='';
  }
  
  // console.log('got %s / l: %s / actual: %s', cmd, length, buf.length);
  
  if(serialNo!='') {
    await bl10.processInfoContent(cmd, infocontent, serialNo, socket)
    let line = socket.id + ";" + serialNo + ";" + cmd + ";" + infocontent+"\n";
    fs.appendFile('received-commands.txt', line, function (err) {
      if (err) throw err;
    });
  }
}

module.exports = bl10;