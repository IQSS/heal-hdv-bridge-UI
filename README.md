# heal-qdr-bridge-UI
User Interface based platform that helps pull data from heal and push to Dataverse instances. 

## 🚀 Features

- Simple form-based UI to collect user input
- Integration with HEAL API for metadata retrieval
- Support for pushing datasets to a Dataverse
- Responsive, user-friendly interface

## 🛠️ Installation

### Prerequisites

- Any local server. Recommended [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (works well with VS code)
- [Visual Studio Code](https://code.visualstudio.com/download) (or any preferred IDE)

### Steps

```bash
# Clone the repository
git clone https://github.com/QualitativeDataRepository/heal-qdr-bridge-UI.git

# Navigate to the project directory
cd heal-qdr-bridge-UI

# Run the page locally
Open index.html and right-click on the editor and click on Open with Live Server or use the 'Go Live' from the status bar to turn the server on/off.

```
The server should now be accessible on [localhost:8888](http://127.0.0.1:8888/)

## 📂 Project Structure

```
├── data
├── public - Assets and styles
│   ├── assets
│   ├── config
│   ├── js
│       └── apicalls
│   └── styles
        └── customfont
└── heal-schema-latest.json
└── index.html - User Interface

```

## 📡 User Interface: `index.html`

Has a basic form to allow user to enter the source and destination information. Form source and destination kept as dropdowns to allow more options in future.

For current implementation. 

Source: Heal - Followed by option to either supply project ID or json file
Destination - Dataverse and prompt to supply user's account API Key

## 🔑 API Key Generation : Dataverse

### Environments

1. **Stage Environment (Testing)**:
   For testing purposes, you can use the [Demo Dataverse site](https://demo.dataverse.org/). or 
   the [QDR Stage site](https://data.stage.qdr.org/).
   
2. **Main Dataverse Environment**:  
   For production use, please generate an API token from the [QDR Main site](https://qdr.syr.edu/).


### Config

Base URL's for Heal and Dataverse are fetched based on the environment.
js > config.js checks for environment based on the hostname of the site and based on that we call the object from dev.js or prod.js

Refer Obtaining Your QDR API Token section from [docs](https://qdr.syr.edu/ati/anno-rep/logging-anno-rep-detailed-instructions)


### 🔸 Form Fields:

| Field Name        | Type     | Required | Description |
|-------------------|----------|----------|-------------|
| `Select Source`   | string   | ✅       | For now only source available is `"HEAL Dataset"`. |
| `Select Data Type`| string / file   | ✅       | Must be `"Project ID"` if fetching from HEAL, or `"JSON File"` to upload a local JSON of study level metadata. |
| `Select Destination`| string  | ✅  | For now only source available is `"Dataverse - Demo"`. |
| `Enter API Key`          | string   | ✅       | A valid QDR Dataverse API key for authentication and upload. |

### 📤 How It Works:

- If `sourceDataType` is `"projectId"`:
  - The API fetches metadata from the HEAL API using the provided project ID.
- Otherwise:
  - It expects a JSON file (`sourceContent`) uploaded via the form and reads it as metadata.

Then:

1. Checks Dataverse for existing datasets with the same heal_platform_persistent_ID exists using logic at `checkRecordDataverse.js` 
2. If the dataset **already exists**, returns `doi persistentId`.
3. Else transforms the metadata to format suitable for upload using `convertToDataverse.js`.
4. Uploads it to dataverse using `uploadToDataverse.js` and returns the new `doi persistentId`.

## 📬 Contact

- [QDR](https://qdr.syr.edu/)
- [OSPO at SU](https://opensource.syracuse.edu/)