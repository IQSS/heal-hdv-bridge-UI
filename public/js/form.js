import { getDataFromHeal } from './apicalls/getDataFromHeal.js';
import { healToDataverse } from './apicalls/convertToDataverse.js';
import { uploadToDataverse } from './apicalls/uploadToDataverse.js';
import { checkRecordDataverse } from './apicalls/checkRecordDataverse.js';

document.addEventListener("DOMContentLoaded", function () {
    var formSubmitted = false

    function showMessage(type, message) {
        const isMobile = window.innerWidth <= 768;
    
        if (isMobile) {
            const alertDiv = document.getElementById('api-response-message');
            if (alertDiv) {
                alertDiv.style.display = "block";
                alertDiv.className = `alert alert-${type}`;
                alertDiv.innerHTML = message;
            }
        } else {
            const apiResponseContainer = document.getElementById('apiResponseContainer');
            if (apiResponseContainer) {
                const content = type === 'info'
                    ? `<div class="card shadow-sm p-3"><p class="text-dark">${message}</p></div>`
                    : `<p class="text-danger">❌ ${message}</p>`;
                apiResponseContainer.innerHTML = content;
            }
        }
    }    

    document.querySelector("form").addEventListener("submit", async function (event) {
        event.preventDefault(); 

        const overlay = document.getElementById("loading-overlay");
        const bannerImage = document.getElementById("bannerImage"); 
        const source = document.getElementById("source").value;
        const sourceDataType = document.getElementById("dataType").value;
        
        //Heal source type can be either project id or uploading json file
        const healID = document.getElementById("healId").value;
        const jsonFile = document.getElementById("jsonFile").files[0];

        const destination = document.getElementById("destination").value;
        const apiKey = document.getElementById("apiKey").value;

        const alertBox = document.getElementById("error-message");

        formSubmitted = true

        if (!source || !destination) {
            showMessage('warning', "Please select both source and destination.")
            return;
        }

        if (sourceDataType === "projectId" && !healID) {
            showMessage('warning', "Please enter a Heal Project ID.")
            return;
        }

        if (sourceDataType === "jsonFile" && !jsonFile) {
            showMessage('warning', "Please upload study metadata json file.")
            return;
        }

        if (destination === "dataverse-qdr" && !apiKey) {
            showMessage('warning', "Please enter an API Key.")
            return;
        }

        overlay.style.display = "flex";

        try {
            let healData;
            if (sourceDataType === "projectId") {
                healData = await getDataFromHeal(healID);
            } else {
                const fileText = await jsonFile.text();
                healData = JSON.parse(fileText);
            }

            if(!healData.citation){
                showMessage('warning', 'Invalid metadata schema. Please check and retry')
                return;
            }

            const nih_persistent_id = healData.citation.heal_platform_persistent_ID
            let message = ''
            var duplicateCheck;

            console.log(nih_persistent_id)
            if(nih_persistent_id){
                duplicateCheck = await checkRecordDataverse(nih_persistent_id, apiKey);
            }else{
                message = `Missing heal_platform_persistent_ID from json schema, can't check if record exists at Dataverse adding new record. This may cause duplicates `
            }

            console.log(duplicateCheck)

            if(duplicateCheck && duplicateCheck.datasetExists){
                message = `⚠️ Record with same dataset title already exists. You can access it here: <a href="https://demo.dataverse.org/dataset.xhtml?persistentId=${duplicateCheck.persistentId}" target="_blank">${duplicateCheck.persistentId}</a>`
                formSubmitted = false
            }else{
                const convertToDataverse = await healToDataverse(healData);
                message += await uploadToDataverse(convertToDataverse, apiKey); 
            }
            
            showMessage('info', message)

        }catch(error){
            console.error(error);
            showMessage('warning', error.message);
        }finally{
            overlay.style.display = "none";
            formSubmitted = false
        }

        // fetch("/push/qdr", {
        //     method: "POST",
        //     body: requestData,
        // })
        // .then(response => response.json().then(data => ({ status: response.status, body: data }))) 
        // .then(({ status, body }) => {
        //     console.log(body)
        //     let message = "";
            
        //     switch (status) {
        //         case 200:
        //             if(body.created){
        //                 message = `✅ Success! Your data has been pushed to QDR. You can access it here: <a href="https://data.stage.qdr.org/dataset.xhtml?persistentId=${body.persistentId}" target="_blank">${body.persistentId}</a>`;
        //             }else{
        //                 message = `⚠️ Record with same dataset title already exists. You can access it here: <a href="https://data.stage.qdr.org/dataset.xhtml?persistentId=${body.persistentId}" target="_blank">${body.persistentId}</a>`;
        //             }
        //             break;
        //         case 400:
        //             message = "⚠️ Bad Request: Your input data might be incorrect.";
        //             break;
        //         case 401:
        //             message = "❌ Unauthorized: Your API key might be incorrect.";
        //             break;
        //         case 403:
        //             message = "⛔ Forbidden: You do not have permission to perform this action.";
        //             break;
        //         case 404:
        //             message = "🔍 Not Found: The requested resource was not found.";
        //             break;
        //         case 500:
        //             message = "❌ Server Error: Something went wrong on our end. Please try again later.";
        //             break;
        //         default:
        //             message = `❌ Unexpected error (Status ${status}): ${body.message || "Please contact <a mailto:'qdr@syr.edu'> support</a>. "}`;
        //     }

        //     if(bannerImage){
        //         bannerImage.style.display = "none";
        //     }
            
        //     apiResponseContainer.innerHTML = `
        //         <div class="card shadow-sm p-3">
        //             <p class="text-dark">${message}</p>
        //         </div>
        //     `;
        // })
        // .catch(error => {
        //     console.log(error)
        //     apiResponseContainer.innerHTML = `<p class="text-danger">❌ Network Error: ${error.message}</p>`;
        // })
        // .finally(() => {
        //     overlay.style.display = "none";
        // });
    });

    document.querySelector("form").addEventListener('change', function() {

        if(formSubmitted){
            const source = document.getElementById("source").value;
            const sourceDataType = document.getElementById("dataType").value;
            
            //Heal source type can be either project id or uploading json file
            const healID = document.getElementById("healId").value;
            const jsonFile = document.getElementById("jsonFile").files[0];
        
            const destination = document.getElementById("destination").value;
            const apiKey = document.getElementById("apiKey").value;
        
            const alertBox = document.getElementById("error-message");
        
            if (!source || !destination) {
                alertBox.style.display = "block";
                alertBox.innerHTML = "Please select both source and destination."
                return;
            }
        
            if(!sourceDataType){
                alertBox.style.display = "block";
                alertBox.innerHTML = "Please select a source data type."
                return;
            }
        
            if (sourceDataType === "projectId" && !healID) {
                alertBox.style.display = "block";
                alertBox.innerHTML = "Please enter a Heal Project ID."
                return;
            }
        
            if (sourceDataType === "jsonFile" && !jsonFile) {
                alertBox.style.display = "block";
                alertBox.innerHTML = "Please upload study metadata json file."
                return;
            }
        
            if (destination === "dataverse-qdr" && !apiKey) {
                alertBox.style.display = "block";
                alertBox.innerHTML = "Please enter an API Key."
                return;
            }
        
            alertBox.style.display = "none"
        }
    });
});