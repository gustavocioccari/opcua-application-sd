Error.stackTraceLimit = Infinity;

const cities = ['Florianopolis','Joinville'];

const BASE_URL = "https://community-open-weather-map.p.rapidapi.com/weather?id=2172797"
const query = "&units=metric&mode=json&q="

const fs = require("fs");
const key = fs.readFileSync("api-key.key");

const unirest = require("unirest");
async function getCityWeather(city) {

    const result = await new Promise((resolve) => {
        unirest.get(
            BASE_URL+query+city)
        .header("X-RapidAPI-Host", "community-open-weather-map.p.rapidapi.com")
        .header("X-RapidAPI-Key", key)
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
    return  {
        city:               data.city,
        temperature:        data.main.temp,
    };
}

const city_data_map = { };

const next_city  = ((arr) => {
   let counter = arr.length;
   return function() {
      counter += 1;
      if (counter>=arr.length) {
        counter = 0;
      }
      return arr[counter];
   };
})(cities);

async function update_city_data(city) {

    try {
        const data  = await getCityWeather(city);
        city_data_map[city] = extractUsefulData(data);
    }
    catch(err) {
        console.log("error city",city , err);
        return ;
    }
}

const interval = 30 * 1000;
setInterval(async () => {
     const city = next_city();
     console.log("updating city =",city);
     await update_city_data(city);
}, interval);

const opcua = require("node-opcua");

function construct_my_address_space(server) {
    
    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();
    const objectsFolder = addressSpace.rootFolder.objects;

    const citiesNode  = namespace.addFolder(objectsFolder,{ browseName: "Cities"});

    for (let city_name of cities) {
        
        const cityNode = namespace.addFolder(citiesNode,{ browseName: city_name });
        namespace.addVariable({
            componentOf: cityNode,
            browseName: "Temperature",
            nodeId: `s=${city_name}-Temperature`,
            dataType: "Double",
            value: {  get: function () { return extract_value(opcua.DataType.Double, city_name,"temperature"); } }
        });
    }
}
function extract_value(dataType,city_name,property) {
    const city = city_data_map[city_name];
    if (!city) {
        return opcua.StatusCodes.BadDataUnavailable
    }

    const value = city[property];
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