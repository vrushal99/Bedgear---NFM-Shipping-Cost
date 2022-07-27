/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/***********************************************************************
 * Description:  This Script will work for Calculating Shipping Cost on Sales Order, Invoice
 * and Item Fulfillment Record based on Conditions like Mattress Landed is Checked or Not on 
 * Customer and Item Record,Item Types included are Inventory Items or Assembly/bill Items or 
 * Kit Items and other Items are Excluded from the Calculation, "EXCLUDED FROM NEW FREIGHT MODEL" 
 * checkbox is Checked or Not and based on this Conditions it will Calculate Shipping Subtotal 
 * from the Total Item Amount and based on Shipping Subtotal and State it will map Search 
 * Percentage from "New Freight Model_1" Custom Record and then Calculating Shipping Cost and 
 * Set on Shipping Cost Field.      
 
 * Version: 1.0.0 - Initial version
 * Author:  Green Business/Palavi Rajgude
 * Date:    08-02-2022
 
 ***********************************************************************/

 define([
  "N/search",
  "N/runtime",
  "N/record",
  "SuiteScripts/Green Business Systems/SuiteScripts/GBS_LIB_UE_calculateShippingCost.js"
], function (search, runtime, record, lib) {
  //function for calculating shipping cost on sales order, invoice and item fulfillment
  function shippingCostFreightCalculation(context) {
    try {
      var calculateShippingCostScript = runtime.getCurrentScript();

      var loadTransactionRecord = context.newRecord;

      var recordType = loadTransactionRecord.type;

      //check pop sales order form id
      var checkPopFormId = calculateShippingCostScript.getParameter({
        name: "custscript_gbs_form_id"
      });

      var getCustomerId = loadTransactionRecord.getValue({
        fieldId: "entity"
      });

      var getPercentFromCustomer = search.lookupFields({
        type: "customer",
        id: getCustomerId,
        columns: ["custentity_percent_nfm_customer"]
      });

      //check pop invoice form id
      var checkInvoiceFormId = calculateShippingCostScript.getParameter({
        name: "custscript_gbs_invoice_form_id"
      });

      //get pop sales order form
      var checkPopForm = loadTransactionRecord.getValue({
        fieldId: "customform"
      });

      //get "MANUAL FREIGHT COST" checkbox value
      var checkManualFreightCost = loadTransactionRecord.getValue({
        fieldId: "custbody_gbs_invoice_manual_freight_co"
      });

      var getChargedFlatShippingCost = loadTransactionRecord.getValue({
        fieldId: "custbody_charged_flat_shipping_sales"
      });

      var runShippingCostObject = {
        loadTransactionRecord: loadTransactionRecord,
        calculateShippingCostScript: calculateShippingCostScript,
        recordType: recordType,
        getChargedFlatShippingCost: getChargedFlatShippingCost,
        getPercentFromCustomer: getPercentFromCustomer
      };

      var getChargeActualShipping = loadTransactionRecord.getValue({
        fieldId: "custbody_gbs_charge_actual_shipping_so"
      });
      
      //Added by Chris Smith 03/23/2022
      // Start Chris Smith Edit
      if (recordType == "invoice" ) {
        var exclude = loadTransactionRecord.getValue({fieldId: 'custbody_gbs_excluded_sale_freight_mod'});
        if (exclude == true) {
          loadTransactionRecord.setValue({fieldId: 'shippingcost', value: 0});
          return;
        }
      }
      // End Chris Smith Edit

      //if form type is not pop form and record type is sales order then calculate shipping cost on sales order
      if (checkPopForm != checkPopFormId && recordType == "salesorder") {
        runShippingCostCalculation(runShippingCostObject);
      }
      //else if form type is not pop form and record type is invoice then calculate shipping cost on invoice
      else if (
        checkPopForm != checkInvoiceFormId &&
        recordType == "invoice" &&
        checkManualFreightCost != true
      ) {
        if (getChargeActualShipping == true) {
          return;
        } else {
          runShippingCostCalculation(runShippingCostObject);
        }
      }

      //else if record type is itemfulfillment then calculate shipping cost on item fulfillment record
      else if (recordType == "itemfulfillment") {
        log.debug({
          title: '114'
        })
        if (getChargeActualShipping == true) {
          log.debug({
            title: '115'
          })
          lib.chargeActualShippingIF(loadTransactionRecord);
        } 
        else {
          log.debug({
            title: '124'
          })
          getAmountItemFulfillment(runShippingCostObject);
        }
      }
    } catch (error) {
      log.debug(
        "Error in shippingCostFreightCalculation() function",
        error.toString()
      );
    }
  }

  //calculate shipping cost on sales order and invoice record
  function runShippingCostCalculation(runShippingCostObject) {
    try {
      var {
        loadTransactionRecord,
        calculateShippingCostScript,
        recordType,
        getChargedFlatShippingCost,
        getPercentFromCustomer
      } = runShippingCostObject;

      var shippingCostSubtotal = 0;

      //get shipping address from sales order
      var shipaddrSubRecord = loadTransactionRecord.getSubrecord({
        fieldId: "shippingaddress"
      });

      //get "state" from shipping address subrecord
      var stateOnSubRecord = shipaddrSubRecord.getValue({ fieldId: "state" });

      //get "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value
      var checkExcludeFreightModel = loadTransactionRecord.getValue({
        fieldId: "custbody_gbs_excluded_sale_freight_mod"
      });

      log.debug({
        title: 'checkExcludeFreightModel',
        details: checkExcludeFreightModel
      })

      //if "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value is not equal to true then check "Shipping Method" otherwise script will not calculate shipping cost
      if (checkExcludeFreightModel != true) {
        //sales order record data pass to "subtotalForMattressLanded" function
        shippingCostSubtotal = lib.subtotalForMattressLanded(
          loadTransactionRecord
        );
       
          //set shipping cost subtotal value on "SUBTOTAL FOR NEW FREIGHT CALCULATION" field
          loadTransactionRecord.setValue({
            fieldId: "custbody_gbs_sale_subtotal_freight_cal",
            value: parseFloat(nullValidation(shippingCostSubtotal))
          });
        

        //if record type is sales order then shipping cost subtotal and sales order record data pass to "getPercentFromState" function
        if (recordType == "salesorder") {
          if (getChargedFlatShippingCost == true) {

              loadTransactionRecord.setValue({
                fieldId: "custbody_gbs_sale_percent_freight_calc",
                value: parseInt(nullValidation(getPercentFromCustomer.custentity_percent_nfm_customer))
              });
             
            
          } else {
            lib.getPercentFromState(
              shippingCostSubtotal,
              loadTransactionRecord,
              stateOnSubRecord
            );
          }
        }

        //shipping cost subtotal and sales order record data pass to "shippingCost" function
        lib.shippingCost(shippingCostSubtotal, loadTransactionRecord);
      }
    } catch (error) {
      log.debug(
        "error in runShippingCostCalculation() function",
        error.toString()
      );
    }
  }

  //calculate shipping cost subtotal from item fulfillment record
  function getAmountItemFulfillment(runShippingCostObject) {
    try {
      var {
        loadTransactionRecord,
        calculateShippingCostScript,
        recordType,
        getChargedFlatShippingCost
      } = runShippingCostObject;
      log.debug({
        title: '222'
      })
      //get shipping address from sales order
      var shipaddrSubRecord = loadTransactionRecord.getSubrecord({
        fieldId: "shippingaddress"
      });

      //get "state" from shipping address subrecord
      var stateOnSubRecord = shipaddrSubRecord.getValue({ fieldId: "state" });

      //if state is not present on shipping address then script will not calculate shipping cost
      if (stateOnSubRecord == "") {
        return false;
      }

      //get "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value
      var checkExcludeFreightModel = loadTransactionRecord.getValue({
        fieldId: "custbody_gbs_excluded_sale_freight_mod"
      });

      var shippingCostSubtotal = 0;
      //if "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value is not equal to true then check "Shipping Method" otherwise script will not calculate shipping cost
      if (checkExcludeFreightModel != true) {
        //get shipping method from sales order record
        

        //check "Custom" shipping method id
        // var checkShippingMethodId = calculateShippingCostScript.getParameter({
        //   name: "custscript_gbs_shipping_method_id",
        // });

        //if "Shipping Method" is custom then calculate shipping cost
        
    

          //get value from "Mattress Landed" checkbox
          var mattressSalesOrder = loadTransactionRecord.getValue({
            fieldId: "custbody_gbs_sale_mattress_land"
          });

          //get sales order record from "CREATED FROM" field
          var createFromItemFul = loadTransactionRecord.getValue({
            fieldId: "createdfrom"
          });

          var lineCountItem = loadTransactionRecord.getLineCount({
            sublistId: "item"
          });

          var loadSo = record.load({
            type: record.Type.SALES_ORDER,
            id: createFromItemFul
          });

          for (var i = 0; i < lineCountItem; i++) {

               //get item id from line items
               var itemRecieveIF = loadTransactionRecord.getSublistValue({
                sublistId: "item",
                fieldId: "itemreceive",
                line: i
              });

              if(itemRecieveIF == true){

            //get item id from line items
            var itemIdOnItemFulfill = loadTransactionRecord.getSublistValue({
              sublistId: "item",
              fieldId: "item",
              line: i
            });

            //get value from items on sales order
            var itemFulfillLine = loadSo.findSublistLineWithValue({
              sublistId: "item",
              fieldId: "item",
              value: itemIdOnItemFulfill
            });

            //get line item type from item fulfillment
            var itemType = search.lookupFields({
              type: search.Type.ITEM,
              id: itemIdOnItemFulfill,
              columns: ["type"]
            });

            if (mattressSalesOrder == true) {
              //get "Mattress Landed" checkbox value from line item
              var lineItemMattress = loadTransactionRecord.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_gbs_sale_line_mattress_land",
                line: i
              });

              //if "Mattress Landed" checkbox value is false on line item then check item type from item fulfillment record
              if (lineItemMattress == false) {
                //if line item type is assembly/bill or inventory or kit/package item then calculate subtotal from line item amount
                if (
                  itemType.type[0].value == "Assembly" ||
                  itemType.type[0].value == "InvtPart" ||
                  itemType.type[0].value == "Kit"
                ) {
                  shippingCostSubtotal =
                    shippingCostSubtotal +
                    loadSo.getSublistValue({
                      sublistId: "item",
                      fieldId: "amount",
                      line: itemFulfillLine
                    });
                }
              }
            } else if (mattressSalesOrder == false) {
              //if line item type is assembly/bill or inventory or kit/package item then calculate subtotal from line item amount
              if (
                itemType.type[0].value == "Assembly" ||
                itemType.type[0].value == "InvtPart" ||
                itemType.type[0].value == "Kit"
              ) {
                shippingCostSubtotal =
                  shippingCostSubtotal +
                  loadSo.getSublistValue({
                    sublistId: "item",
                    fieldId: "amount",
                    line: itemFulfillLine
                  });
              }
            }
          }
        }

        

        loadTransactionRecord.setValue({
          fieldId: "custbody_gbs_sale_subtotal_freight_cal",
          value: shippingCostSubtotal
        });
        
        lib.shippingCost(shippingCostSubtotal, loadTransactionRecord);
      }

      //set shipping cost subtotal on "SUBTOTAL FOR NEW FREIGHT CALCULATION" field
    
    } catch (error) {
      log.debug(
        "error in getAmountItemFulfillment() function",
        error.toString()
      );
    }
  }

  function nullValidation(value){
    if (
      value == null &&
      value == "" && value == undefined
    ) {
      value = 0;
    }

    return value;
  }
  return {
    beforeSubmit: shippingCostFreightCalculation,
 
  };
});
