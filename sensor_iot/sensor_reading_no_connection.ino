bool BPMTiming=false;
bool BeatComplete=false;
float LastTime=0;
float BPM=0;
float interval=0;
int sensor=0;

#define UpperThreshold 555
#define LowerThreshold 550

void setup() {
  Serial.begin(9600);
  pinMode(sensor,INPUT); 
}


void loop() {

  int value=analogRead(sensor);
  Serial.println(value);
  // calc bpm
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
  if((value<LowerThreshold)&(BPMTiming))
    BeatComplete=true;
  // output bpm to serial monitor
  Serial.print(BPM);
  Serial.println(" BPM");
  delay(200);
}
