# electron-adf

Hackaton Alfresco DevCon 2019:  <br/>

Electron is a Framework for developing cross platform desktop applications using JavaScript and a WebEngine. 
This project was build during the Alfresco DevCon Hackaton 2019. 
It implement a electron desktop application based on the Alfresco Content App (ADF). 

# Install 
**for Electron**:

 ```
 npm install
 ```
 
**for Alfresco Content App**: 

  ```
  cd Content-App
  npm install
  ```


# Run

In development we run electron and adf separately:

run `npm start:adf` to start up Alfresco Content App

In a second console 

run `npm start:electron` to start up electron which uses the main.js as an entry point
