/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */

define(["N/search", "N/record"], function (search, record) {
    function saverecord(context) {
        try {
            var currentrecord = context.currentRecord;

            var shipaddrSubRecord = currentrecord.getSubrecord({
                fieldId: "shippingaddress",
            });

            var stateOnSubRecord = shipaddrSubRecord.getValue({ fieldId: "state" });


            if (stateOnSubRecord == "" || stateOnSubRecord == null || stateOnSubRecord == undefined ) {
                alert("Shipping cost won't be calculated as state is undefined.");

                return true;
            } else {
                var stateFromSavedSearch = searchState(stateOnSubRecord);


                if ( stateFromSavedSearch == "" || stateFromSavedSearch == null || stateFromSavedSearch == undefined ) {

                    alert("Shipping cost won't be calculated for the defined state, state is not defined 'New Freight Model' calculation." );

                    return true;
                }
                return true;
            }
        } catch (error) {
            log.debug("error in function", error.toString());
        }
    }

    function searchState(stateOnSubRecord) {
        try {
            var searchOnNewFreightModel = search.create({
                type: "customrecord_gbs_nfm",
                filters: [
                    ["custrecord_gbs_nfm1_state", "is", stateOnSubRecord],
                ],
                columns: [
                    search.createColumn({
                        name: "custrecord_gbs_nfm1_state",
                        label: "State",
                    }),
                    search.createColumn({
                        name: "custrecord_gbs_nfm1_country",
                        label: "Country",
                    }),
                ],
            });

    
            var searchResult = searchOnNewFreightModel.run().getRange(0,2);
            
            var stateFromSavedSearch = "";

            if(searchResult[0] != "" && searchResult[0] != null && searchResult[0] != undefined){

            
                stateFromSavedSearch = searchResult[0].getValue("custrecord_gbs_nfm1_state");

            }
                return stateFromSavedSearch;
        

            

        } catch (error) {
            log.debug("error in function searchState()", error.toString());
        }
    }

    return {
        saveRecord: saverecord,
    };
});
