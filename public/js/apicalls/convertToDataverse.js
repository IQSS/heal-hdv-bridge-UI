/**
 * Converts a HEAL json input to a Dataverse JSON output
 * @param {object} input - HEAL json object
 * @return {object} Dataverse JSON object to upload to a server instance
 */

const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

export async function healToDataverse(input) {

    //Preprocessing the input data before it goes to validator
    //getting cases of study_stage being empty or being a string 
    // instead of array cauing validator to fail
    if(input.study_type.study_stage === ""){
        delete input.study_type.study_stage
    }

    if (typeof input.study_type.study_stage === "string") {
        input.study_type.study_stage = [input.study_type.study_stage];
        //console.log(input.study_type.study_stage)
    }


    const datefields = ["data_collection_start_date", "data_collection_finish_date", "data_release_start_date", "data_release_finish_date"]
    const flowingEmptyFields = ["study_primary_or_secondary", "study_observational_or_experimental", "data_release_status", "data_available", "data_collection_status", "data_restricted", "study_translational_focus"]

    var output = { datasetVersion: { metadataBlocks: {
            citation: { fields: new Array,
                name: "citation", displayName: "Citation Metadata" },
            heal: { fields: new Array,
                displayName: "HEAL metadata schema", name: "heal" }
    }}};

    let schema = await fetch("./heal-schema-latest.json").then(response => response.json());

    const Ajv = window.ajv2020
    const ajv = new Ajv({strict: false})

    const validate = ajv.compile(schema);
    const valid = validate(input);

    if (!valid) {
        console.log("Invalid json schema")
        return;
    }


    var citation = output.datasetVersion.metadataBlocks.citation.fields;
    var heal = output.datasetVersion.metadataBlocks.heal.fields;


    // Copy heal metadata block as closely as possible
    // Nesting in the HEAL JSON rarely goes beyond two levels
    // so we will run two nested forEach loops, handling various data types
    Object.keys(input).forEach(function(key) { // top level of each block in HEAL json
        // contacts and registrants are handled separately
        if (key !== "contacts_and_registrants") {
            let new_field = {
                typeName: key, 
                typeClass: "compound",
                multiple: false,
                value: new Object
            };

            // second level of each block in HEAL json
            Object.keys(input[key]).forEach(function(key_2) {
                //console.log(key.concat(": ", key_2)); // for debugging which field breaks
                // data repositories goes top-level later below
                if (key_2 !== "data_repositories") { 
                    new_field.value[key_2] = {
                        typeName: key_2,
                        multiple: false,
                    };
                    
                    let field_schema_key = schema['properties'][key];

                    if(typeof field_schema_key === 'undefined'){
                        return;
                    }

                    let field_schema = field_schema_key['properties'][key_2];

                    if(typeof field_schema === 'undefined'){
                        return;
                    }

                    let field_type = field_schema.type;

                    // if(datefields.includes(key_2) && !moment(input[key][key_2], "YYYY-MM-DD", true).isValid()){
                    //     // console.log(key_2 + "is excluded");
                    //     return;
                    // }
                    
                    // console.log(key, key_2, field_type)
                    new_field.value[key_2]['value'] = input[key][key_2];

                    if(key_2 === "heal_funded_status" || key_2 === "study_collection_status" || key_2 === "produce_data" || key_2 === "produce_other"){
                        new_field.value[key_2].typeClass = "controlledVocabulary";
                        if (input[key][key_2] == "true") {
                            new_field.value[key_2].value = "Yes";
                        } else {
                            new_field.value[key_2].value = "No";
                        }
                    }

                    // handling logic for date fields
                    else if(datefields.includes(key_2)){
                        new_field.value[key_2].typeClass = "primitive"
                        if(isValidDate(input[key][key_2])){
                            new_field.value[key_2].value = input[key][key_2]
                        }else{
                            new_field.value[key_2].value = ""
                        }
                        
                    }

                    // start by handling simple strings, detect controlledVocab
                    else if (field_type == "string") {
                        //any empty fields can be deleted
                        if(flowingEmptyFields.includes(key_2) && new_field.value[key_2].value == ""){
                            delete new_field.value[key_2]
                        }
                        // console.log(key_2)
                        else if (typeof field_schema.enum !== "undefined") {
                            new_field.value[key_2].typeClass = "controlledVocabulary";
                        } else {
                            new_field.value[key_2].typeClass = "primitive";
                        }
                    } else if (field_type == "integer") {
                        // integers need to be strings
                        new_field.value[key_2].typeClass = "primitive";
                        new_field.value[key_2].multiple = false;
                        //console.log(key.concat(": ", key_2));
                        new_field.value[key_2]['value'] = input[key][key_2].toString();
                    
                    // handling more complex objects
                    } else if (field_type == "array") {
                        var isRemoved = false;
                        if (field_schema.items.type == "string") {
                            new_field.value[key_2].multiple = true;
                            if (key_2 == "treatment_mode" || key_2 == "treatment_application_level" || key_2 == "treatment_novelty") {
                                new_field.value[key_2].multiple = false;
                                if(new_field.value[key_2]['value'][0]){
                                    new_field.value[key_2]['value'] = new_field.value[key_2]['value'][0]; 
                                }else{
                                    //treatment_mode, treatment_application_level, treatment_novelty
                                    // are sometimes coming as empty array [] can't extract value [0] 
                                    // "" are prohibited too at dataverse side so deleting the field
                                    delete new_field.value[key_2]
                                    isRemoved = true
                                }
                            }

                            if(!isRemoved){
                                // Is there controlled vocabulary?
                                if (typeof field_schema.items.enum !== 'undefined') {
                                    new_field.value[key_2].typeClass = "controlledVocabulary";
                                } else {
                                    //new_field.value[key_2].multiple = false;
                                    new_field.value[key_2].typeClass = "primitive";
                                }
                            }
                        }
                    }

                    // Change boolean to Yes/No strings
                    if (field_type == "boolean") {
                        new_field.value[key_2].typeClass = "controlledVocabulary";
                        if (input[key][key_2]) {
                            new_field.value[key_2].value = "Yes";
                        } else {
                            new_field.value[key_2].value = "No";
                        }
                    }
                }
            });
            
            // reset "citation" to "heal_citation" for dataverse compatibility
            // similar issue with study_translational_focus
            if (new_field.typeName == "citation") {
                new_field.typeName = "heal_citation"
            } else if (new_field.typeName == "study_translational_focus") {
                new_field.typeName = "study_translational_focus_group"
            }

            heal.push(new_field);
        }
    });

    if (typeof input.citation.heal_funded_status == 'undefined') {
        throw "Need heal funded status"
    }

    // move registrants to the top level, DV compatibility issue
    if (typeof input.contacts_and_registrants.registrants == 'undefined') {
        throw "need a registrant"
    }

    var registrants = {
        typeName: "registrants",
        typeClass: "compound",
        multiple: true,
        value: new Array
    };

    input.contacts_and_registrants.registrants.forEach(function(entry) {
        Object.keys(entry).forEach(function(value) {
            entry[value] = {
                typeName: value,
                multiple: false,
                typeClass: "primitive",
                value: entry[value]
            }
        });
        registrants.value.push(entry);
    });
    heal.push(registrants);


    if (typeof input.metadata_location.data_repositories !== 'undefined') {
        // also move repositories to the top level
        var repositories = {
            typeName: "data_repositories",
            typeClass: "compound",
            multiple: true,
            value: new Array
        };

        input.metadata_location.data_repositories.forEach(function (entry) {
            Object.keys(entry).forEach(function (value) {
                entry[value] = {
                    typeName: value,
                    multiple: false,
                    typeClass: "primitive",
                    value: entry[value]
                }
            });
            repositories.value.push(entry);
        });
        heal.push(repositories);
    }

    // Add the standardr dataverse citation fields
    citation.push({ value: input.minimal_info.study_name,
        typeClass: "primitive", multiple: false, typeName: "title" });

    if (typeof input.citation.investigators == "undefined") {
        throw "Need an investigator";
    }

    let author = { value: new Array, typeClass: "compound", multiple: true, typeName: "author"};
    input.citation.investigators.forEach(function(investigator) {
        // missing investigator ID
        if (typeof investigator.investigator_ID == 'undefined') {
            investigator.investigator_ID = [ { investigator_ID_type: "ORCID",
                investigator_ID_value: "" } ];
        } if (investigator.investigator_ID == []) {
            investigator.investigator_ID.push( { investigator_ID_type: "ORCID",
                                                investigator_ID_value: "" } );
        } if (investigator.investigator_ID[0].investigator_ID_type !== "ORCID") {
            throw "Only ORCID IDs currently supported"
        }
        // missing names
        if (typeof investigator.investigator_last_name == 'undefined') {
            investigator.investigator_last_name = "";
        } if (typeof investigator.investigator_first_name == 'undefined') {
            investigator.investigator_first_name = "";
        } if (typeof investigator.investigator_affiliation == 'undefined') {
            investigator.investigator_affiliation = "";
        }

        let new_investigator = {
            authorName: {
                value: investigator.investigator_last_name.concat(", ", investigator.investigator_first_name),
                typeClass: "primitive", multiple: false, typeName: "authorName"
            }, authorAffiliation: { value: investigator.investigator_affiliation,
                typeClass: "primitive", multiple: false, typeName: "authorAffiliation"
            }, authorIdentifierScheme: { value: investigator.investigator_ID[0].investigator_ID_type,
                typeName: "authorIdentifierScheme", multiple: false, typeClass: "controlledVocabulary"
            }, authorIdentifier: { value: investigator.investigator_ID[0].investigator_ID_value,
                typeName: "authorIdentifier", multiple : false, typeClass: "primitive"
            }
        };
        author.value.push(new_investigator);
    });
    citation.push(author);

    if (typeof input.contacts_and_registrants.contacts == 'undefined') {
        throw "need a contact";
    }


    let datasetContact = { value: new Array, typeClass: "compound",
        multiple: true, typeName: "datasetContact" };
    input.contacts_and_registrants.contacts.forEach(function(contact) {
        if (typeof contact.contact_email == 'undefined') {
            throw "Contact missing an email address";
        } if (typeof contact.contact_last_name == 'undefined') {
            contact.contact_last_name = ""
        } if (typeof contact.contact_first_name == "undefined") {
            contact.contact_first_name = ""
        }

        let new_contact = {
            datasetContactEmail: {
                typeClass: "primitive",
                multiple: false,
                typeName: "datasetContactEmail",
                value: contact.contact_email
            },
            datasetContactName: {
                typeClass: "primitive",
                multiple: false,
                typeName: "datasetContactName",
                value: contact.contact_last_name.concat(", ", contact.contact_first_name)
            }
        };
        datasetContact.value.push(new_contact);
    });
    citation.push(datasetContact);

    let dsDescription = { value : new Array, typeClass: "compound", 
        multiple: true, typeName: "dsDescription" };
    dsDescription.value.push({
        dsDescriptionValue: {
            value: input.minimal_info.study_description,
            multiple: false,
            typeClass: "primitive",
            typeName: "dsDescriptionValue"
        }
    });
    citation.push(dsDescription);

    let subject = { value: new Array, typeClass: "controlledVocabulary", 
        multiple: true, typeName: "subject" };
    subject.value.push("Medicine, Health and Life Sciences");
    citation.push(subject);
    
    return output;
    
}
