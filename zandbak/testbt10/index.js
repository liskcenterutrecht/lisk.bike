// experimental code for Concox BL10 lock socket server
//
// parse code borrowed from https://gitlab.com/elyez/concox

const net = require('net');
const util = require('./util')
const crc16 = require('crc16-itu')

var wheresent = false;

let data = '7979004a3213090f1721070cc40595cad8008cb07801148d0900cc0400de00fa4c232400de00fa4a1a00de00e5fd1400de00313a1100de0002830c00de0002820900de006ea205000c00003cee700d0a'
let gps = {
    protocol  : data.substr(8,2),
    gpstime   : util.toTime(data.substr(10,2), data.substr(12,2), data.substr(14,2), data.substr(16,2), data.substr(18,2), data.substr(20,2), 'hex'),
    infolength: util.hex2int(data.substr(22,2)),
    satellite : util.hex2int(data.substr(24,2)),
    latitude  : parseFloat(util.hex2int(data.substr(26,8)) / 1800000),
    longitude : parseFloat(util.hex2int(data.substr(34,8)) / 1800000),
    altitude  : 0,
    speed     : util.hex2int(data.substr(42,2)),
    heading   : 0,
    mileage   : 0,
    event     : 0,
    input     : '00000000',
    output    : '00000000',
    location  : '',
    received  : new Date().toISOString(),
    others    : {}
};

let binary = util.hex2bin(data.substr(44,2)) + util.hex2bin(data.substr(45,2));

if (parseInt(binary.substr(4,1)) == 1) gps.longitude *= -1;
if (parseInt(binary.substr(5,1)) == 0) gps.latitude *= -1;

gps.heading = parseInt( binary.substr(6,10), 2);

gps.others.gsm = {
    mcc: parseInt("0x"+data.substr(50,4)),
    mnc: parseInt("0x"+data.substr(54,2)),
    lac: parseInt("0x"+data.substr(56,4)),
    cid: parseInt("0x"+data.substr(60,6))
}

// const statusInfo = socket.statusInfo;
// if (statusInfo) {
//   gps.input = statusInfo.input;
//   gps.others.signal = statusInfo.signal;
//   gps.others.batt = statusInfo.batt;
// }

if (data.length > 75) {
  const statusInfo = util.hex2bin(data.substr(62,2));
  gps.input = '0' + statusInfo.substr(5,1) + statusInfo.substr(6,1) + '0';

  if (statusInfo.substr(2,3) === '100') gps.event = -65;
  else if (statusInfo.substr(2,3) === '011') gps.event =  17;
  else if (statusInfo.substr(2,3) === '010')  gps.event = -23;
  else if (statusInfo.substr(2,3) === '001')  gps.event =  30;

  const voltage = util.hex2int(data.substr(64,2));
  gps.others.batt = parseInt(voltage * 100/6) + '%';
  gps.others.signal = 3 * util.hex2int("0"+data.substr(67,1));

  const alarm = util.hex2int(data.substr(68,2));

  if (alarm === 0) {}
  else if (alarm === 1) gps.event = 65;
  else if (alarm === 2)  gps.event = 23;
  else if (alarm === 3)  gps.event =  30;
  else if (alarm === 14) gps.event =  17;
  else if (alarm === 20) gps.event = 102;
}

console.log("%o", gps)

var locks = {};

const parse = (socket, data, callback) => {
  let gps = {
    protocol  : data.substr(8,2),
    gpstime   : util.toTime(data.substr(10,2), data.substr(12,2), data.substr(14,2), data.substr(16,2), data.substr(18,2), data.substr(20,2), 'hex'),
    infolength: util.hex2int(data.substr(22,2)),
    satellite : util.hex2int(data.substr(24,2)),
    latitude  : parseFloat(util.hex2int(data.substr(26,8)) / 1800000),
    longitude : parseFloat(util.hex2int(data.substr(34,8)) / 1800000),
    altitude  : 0,
    speed     : util.hex2int(data.substr(42,2)),
    heading   : 0,
    mileage   : 0,
    event     : 0,
    input     : '00000000',
    output    : '00000000',
    location  : '',
    received  : new Date().toISOString(),
    others    : {}
  };

  let binary = util.hex2bin(data.substr(40,2)) + util.hex2bin(data.substr(42,2));

  if (parseInt(binary.substr(4,1)) == 1) gps.longitude *= -1;
  if (parseInt(binary.substr(5,1)) == 0) gps.latitude *= -1;

  gps.heading = parseInt( binary.substr(6,10), 2);

  gps.others.gsm = {
      mcc: parseInt("0x"+data.substr(44,4)),
      mnc: parseInt("0x"+data.substr(48,2)),
      lac: parseInt("0x"+data.substr(50,4)),
      cid: parseInt("0x"+data.substr(54,6))
  }

  const statusInfo = socket.statusInfo;
  if (statusInfo) {
    gps.input = statusInfo.input;
    gps.others.signal = statusInfo.signal;
    gps.others.batt = statusInfo.batt;
  }

  if (data.length > 75) {
    const statusInfo = util.hex2bin(data.substr(62,2));
    gps.input = '0' + statusInfo.substr(5,1) + statusInfo.substr(6,1) + '0';

    if (statusInfo.substr(2,3) === '100') gps.event = -65;
    else if (statusInfo.substr(2,3) === '011') gps.event =  17;
    else if (statusInfo.substr(2,3) === '010')  gps.event = -23;
    else if (statusInfo.substr(2,3) === '001')  gps.event =  30;

    const voltage = util.hex2int(data.substr(64,2));
    gps.others.batt = parseInt(voltage * 100/6) + '%';
    gps.others.signal = 3 * util.hex2int("0"+data.substr(67,1));

    const alarm = util.hex2int(data.substr(68,2));

    if (alarm === 0) {}
    else if (alarm === 1) gps.event = 65;
    else if (alarm === 2)  gps.event = 23;
    else if (alarm === 3)  gps.event =  30;
    else if (alarm === 14) gps.event =  17;
    else if (alarm === 20) gps.event = 102;
  }

  return gps;
}

const update = (socket, data) => {
  const statusInfo = util.hex2bin( data.substr(8,2) );
  const voltage = util.hex2int(data.substr(10,2));

  const current = {
    input: '0' + statusInfo.substr(5,2) + '00000',
    ignition: (statusInfo.substr(6,1) || '0') == '1',
    batt: parseInt(voltage * 100/6) + '%',
    signal: 3 * util.hex2int("0"+data.substr(13,1))
  }

  socket.statusInfo = current;
}

// sendCommand()
//
// For documentation, see:
// 'BL10 GPS tracker communication protocolV1.0.8  20180408.pdf'
const sendCommand = (command) => {
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

// sendCommand('UNLOCK#');

const processSinglePacket = (socket, buf) => {
  let serialNo;
  
  let cmd = '';
  if (buf.substr(0,4)=='7878') {
    // size stored in 1 byte
    cmd = buf.substr(6,2);
  } else if(buf.substr(0,4)=='7979') {
    // size stored in 2 bytes
    cmd = buf.substr(8,2);
  } else {
    return false
  }
  
  switch(cmd) {
    case '01':  // login packet
      let info = {
        imei: buf.substr(4*2,8*2),
        modelcode: buf.substr(12*2, 2*2),
        timezone: buf.substr(14*2,2*2),
        serialnr: buf.substr(16*2,2*2)
      }
      console.log('login! %o', info)
      socket.name = buf.substr(9,15);
      serialNo = buf.substr(-12, 4);
      break;
    case '21': // online command response
      break;
    case '23': // heartbeat package
      let terminalinfo = util.hex2bin(buf.substr(4*2,1*2));
    
      let hbtinfo = {
        locked: terminalinfo.substr(7,1)=='1',
        charging: terminalinfo.substr(2,1)=='1',
        gpspositioning: terminalinfo.substr(1,1)=='1',
      }

      console.log('heartbeat %o', hbtinfo);
    case '80': // location package
    
      let locationinfo = {
          gpstime   : util.toTime(data.substr(10,2), data.substr(12,2), data.substr(14,2), data.substr(16,2), data.substr(18,2), data.substr(20,2), 'hex'),
          satellite : util.hex2int(data.substr(22,1)),
          longitude : parseFloat(util.hex2int(data.substr(31,8)) / 1800000),
          latitude  : parseFloat(util.hex2int(data.substr(23,8)) / 1800000),
          altitude  : 0,
          speed     : util.hex2int(data.substr(39,2)),
          heading   : 0,
          mileage   : 0,
          event     : 0,
          input     : '00000000',
          output    : '00000000',
          location  : '',
          received  : new Date().toISOString(),
          others    : {}
      };

      // let binary = util.hex2bin(data.substr(40,2)) + util.hex2bin(data.substr(42,2));
      //
      // if (parseInt(binary.substr(4,1)) == 1) gps.longitude *= -1;
      // if (parseInt(binary.substr(5,1)) == 0) gps.latitude *= -1;
      //
      // gps.heading = parseInt( binary.substr(6,10), 2);
      //
      // gps.others.gsm = {
      //     mcc: parseInt("0x"+data.substr(44,4)),
      //     mnc: parseInt("0x"+data.substr(48,2)),
      //     lac: parseInt("0x"+data.substr(50,4)),
      //     cid: parseInt("0x"+data.substr(54,6))
      // }
      //
      // const statusInfo = socket.statusInfo;
      // if (statusInfo) {
      //   gps.input = statusInfo.input;
      //   gps.others.signal = statusInfo.signal;
      //   gps.others.batt = statusInfo.batt;
      // }
      //
      // if (data.length > 75) {
      //   const statusInfo = util.hex2bin(data.substr(62,2));
      //   gps.input = '0' + statusInfo.substr(5,1) + statusInfo.substr(6,1) + '0';
      //
      //   if (statusInfo.substr(2,3) === '100') gps.event = -65;
      //   else if (statusInfo.substr(2,3) === '011') gps.event =  17;
      //   else if (statusInfo.substr(2,3) === '010')  gps.event = -23;
      //   else if (statusInfo.substr(2,3) === '001')  gps.event =  30;
      //
      //   const voltage = util.hex2int(data.substr(64,2));
      //   gps.others.batt = parseInt(voltage * 100/6) + '%';
      //   gps.others.signal = 3 * util.hex2int("0"+data.substr(67,1));
      //
      //   const alarm = util.hex2int(data.substr(68,2));
      //
      //   if (alarm === 0) {}
      //   else if (alarm === 1) gps.event = 65;
      //   else if (alarm === 2)  gps.event = 23;
      //   else if (alarm === 3)  gps.event =  30;
      //   else if (alarm === 14) gps.event =  17;
      //   else if (alarm === 20) gps.event = 102;
      // }

      console.log('location %o', locationinfo);
  }
  
  /***** HEARTBEAT *****/
  if (cmd == '13' || cmd == '23') {
      console.log('heartbeat!')
      // update(socket, buf);
      serialNo = buf.substr(-12,4);
      
      if(false==wheresent) {
        wheresent=true;
        let data = sendCommand('LJDW#');
        console.log('send %s', data);
        socket.write(data);
      }
  }
  /***** LOCATION PACKET *****/
  else if (cmd == '32') {
      console.log('location!')
      data.id = socket.name;
      var parseData = parse(socket, buf);
      data = Object.assign(data, parseData);
      console.log("%o", parseData);
      // next();
  }
  /***** ONLINE COMMAND RESPONSE PACKET *****/
  else if (cmd == '21') {
      console.log('online command response! %s', buf)
  }
  /***** ALARM PACKET *****/
  else if (cmd == '16') {
      console.log('alarm!')
      data.id = socket.name;
      var parseData = parse(socket, buf);
      data = Object.assign(data, parseData);
      serialNo = buf.substr(-12, 4);
      // next();
  } else {
    console.log('unhandled command %s', cmd);
  }

  if (serialNo) {
    console.log('got serial number #%s', serialNo);
    
    const content = `05${cmd}${serialNo}`;
    const crcCheck = crc16(content, 'hex').toString(16);
    let str = new Buffer(`7878${content}${'0000'.substr(0, 4 - crcCheck.length) + crcCheck}0D0A`, 'hex');
    socket.write(str);
  }
}

const doit = (socket, data, next) => {
  const buf = data.toString('hex');
  console.log('got buffer %s',  buf);

  const cmdSplit = buf.split(/(?=7878|7979)/gi)
  cmdSplit.map( buf => {
    processSinglePacket(socket, buf);
  });
};

var server = net.createServer(function(socket) {
  console.log('incoming connection from %s',  socket.remoteAddress);

  socket.on('data', function(data) {
    let next;
    var string = (data.toString());
    console.log(string)
    
    doit(socket, data, next);
    
  });
  // console.log('GOING TO WRITE...')
  // // console.log(sendCommand('UNLOCK#'));
  // console.log(sendCommand('WHERE#'));
  // socket.write(
  //   // sendCommand('UNLOCK#')
  //   sendCommand('WHERE#')
  // );
	// socket.write('Echo server\r\n');
	// socket.pipe(socket);
});

console.log('starting server on port')

// let port = 9020;                // listening port
// let serverip = '0.0.0.0'; // external IP address for this server
let port = 3000;                // listening port
let serverip = '192.168.178.124'; // external IP address for this server

console.log('starting server on %s:%s', serverip, port);
server.listen(port, serverip);