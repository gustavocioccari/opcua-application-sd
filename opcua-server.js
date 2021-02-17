Error.stackTraceLimit = Infinity;

const sensorData = ['SportsSensor'];

const fs = require("fs");
const key = fs.readFileSync("api-key.key");

const BASE_URL = "https://api.thingspeak.com/channels/"
const query = `1297494/feeds.json?api_key=${key}&results=1`

const unirest = require("unirest");
async function getsensorData() {

    const result = await new Promise((resolve) => {
        unirest.get(
            BASE_URL+query)
        .end(
            (response) => {
              console.log(response.body)
              resolve(response)
          });
    });
    if (result.status !== 200) {
        throw new Error("API error");
    }
    return result.body;
}

function extractUsefulData(data) {
    lastReading = data.feeds[0].created_at.replace('T',' ')
    lastReading = lastReading.replace('Z','')
    return  {
        channelName:             data.channel.name,
        channelDescription:      data.channel.description,
        bpm:                     data.feeds[0].field1,
        lastReading:             lastReading,
    };
}

const sensor_data_map = { };

const next_sensorData  = ((arr) => {
   let counter = arr.length;
   return function() {
      counter += 1;
      if (counter>=arr.length) {
        counter = 0;
      }
      return arr[counter];
   };
})(sensorData);

async function update_sensor_data(sensor) {

    try {
        const data  = await getsensorData(sensor);
        sensor_data_map[sensor] = extractUsefulData(data);
        console.log(sensor_data_map)
    }
    catch(err) {
        console.log("error sensor ",sensor , err);
        return ;
    }
}

const interval = 10 * 1000;
setInterval(async () => {
    try{
        const sensor = next_sensorData();
        console.log("updating sensor =",sensor);
        await update_sensor_data(sensor);
    }
    catch(err){
        console.log("error", err);
        return ;
    }
}, interval);

const opcua = require("node-opcua");

function construct_my_address_space(server) {
    
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();
    const objectsFolder = addressSpace.rootFolder.objects;

    const sensorDataNode  = namespace.addFolder(objectsFolder,{ browseName: "sensorData"});

    for (let sensor_name of sensorData) {
        
        const sensorNode = namespace.addFolder(sensorDataNode,{ browseName: sensor_name });
        namespace.addVariable({
            componentOf: sensorNode,
            browseName: "ChannelName",
            nodeId: `s=${sensor_name}-ChannelName`,
            dataType: "String",
            value: {  get: function () { return extract_value(opcua.DataType.String, sensor_name,"channelName"); } }
        });
        namespace.addVariable({
            componentOf: sensorNode,
            browseName: "ChannelDescription",
            nodeId: `s=${sensor_name}-ChannelDescription`,
            dataType: "String",
            value: {  get: function () { return extract_value(opcua.DataType.String, sensor_name,"channelDescription"); } }
        });
        namespace.addVariable({
            componentOf: sensorNode,
            browseName: "BPM",
            nodeId: `s=${sensor_name}-BPM`,
            dataType: "Double",
            value: {  get: function () { return extract_value(opcua.DataType.Double, sensor_name,"bpm"); } }
        });
        namespace.addVariable({
            componentOf: sensorNode,
            browseName: "LastReading",
            nodeId: `s=${sensor_name}-LastReading`,
            dataType: "String",
            value: {  get: function () { return extract_value(opcua.DataType.String, sensor_name,"lastReading"); } }
        });
    }
}

function extract_value(dataType,sensor_name,property) {
    const sensor = sensor_data_map[sensor_name];
    if (!sensor) {
        return opcua.StatusCodes.BadDataUnavailable
    }

    const value = sensor[property];
    return new opcua.Variant({dataType, value: value });
}

(async () => {

    try {
      
      const server = new opcua.OPCUAServer({
         port: 4334,
         buildInfo: {
           productName: "OpcuaServer",
           buildNumber: "7658",
           buildDate: new Date(2019,6,14),
         }
      });
      
      await server.initialize();
      
      construct_my_address_space(server);
      
      await server.start();
      
      console.log("Server is now listening ... ( press CTRL+C to stop)");
      console.log("port ", server.endpoints[0].port);
      const endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
      console.log("the primary server endpoint url is ", endpointUrl );
      
    }
    catch(err) {
       console.log("Error = ",err);
    }
})();