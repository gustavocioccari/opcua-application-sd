/*
Código verifica o pulso do sangue a cada décimo de segundo, faz a média e envia para o sevidor em nuvem o resultado a cada 20 segundos. 
O hardware é composto por: Sensor de frequencia cardiaca e controlador ESP8266, conctado a rede WiFi.
Os dados são enviados usando uma Api para a ferramenta de registro e análise de dados ThingSpeak.
*/

#include <ESP8266WiFi.h>
#include "secrets.h"
#include "ThingSpeak.h" 
// bibliotecas para uso do thingSpeak e espWiFi

bool BPMTiming=false;
bool BeatComplete=false;
float LastTime=0;
float BPM=0;
float BPMmed=0;
float interval=0;
int cont=0;
int sensor=0;
//Declaração de variávies do sistema

#define UpperThreshold 555
#define LowerThreshold 550
//Limites para transição do pulso do sangue, a partir de testes

char ssid[] = "SECRET_SSID";
char pass[] = "SECRET_PASS";   
int keyIndex = 0;        
WiFiClient  client;
// Definições da rede WiFi utilizada

unsigned long myChannelNumber = "SECRET_CH_ID";
const char * myWriteAPIKey = "SECRET_WRITE_APIKEY";
//Dados da API do canal SportSensors no ThingSpeak

void setup() {
  Serial.begin(115200); 
  while (!Serial) {
    ; 
  }
  WiFi.mode(WIFI_STA); 
  ThingSpeak.begin(client); 
  //pinMode(sensor,INPUT);
}
//Inicializa serial, ativa o modo WiFi e inicia o ThingSpeak como cliente para receber os dados

void loop() {
  if(WiFi.status() != WL_CONNECTED){
    Serial.print("Attempting to connect to SSID: ");
    Serial.println(ssid);
    while(WiFi.status() != WL_CONNECTED){
      WiFi.begin(ssid, pass);  // Connect to WPA/WPA2 network. Change this line if using open or WEP network
      Serial.print("conectando ");
      delay(5000);     
    } 
    Serial.println("Você está online!");
  }
  // conecxão WiFi
  Batimento();
  int x = ThingSpeak.writeField(myChannelNumber, 1, BPMmed, myWriteAPIKey);
  if(x == 200){
    Serial.println("Canal atualizado.");
  }
  else{
    Serial.println("Problema para atualizar. Código HTTP " + String(x));
  }
  //escrevendo dados em 1 das 8 possíveis entradas de dados no canal do ThingSpeak
}

void Batimento(){
  for(cont=0;cont<200;cont++){
    int value=analogRead(sensor);
    //Serial.println(value);
    // Leitura do sensor de frequencia cardiaca
    
    if(value>UpperThreshold){
      if(BeatComplete){
        interval=millis()-LastTime;
        BPM=float(60000/interval);
        BPMTiming=false;
        BeatComplete=false;
      }
      if(BPMTiming==false){
        LastTime=millis();
        BPMTiming=true;
      }
    }
    //Registro do intervalo entre os batimentos cardíacos
    
    if((value<LowerThreshold)&(BPMTiming))
      BeatComplete=true;
    //atualização da variável de estado
    
    BPMmed=BPM+BPMmed;
    delay(100);
    //Atualização da variavel para calculo do BPM a cada 0,1s
  }
  BPMmed=BPMmed/cont;
  cont=0;
  //Calculo da média de BPM
}
