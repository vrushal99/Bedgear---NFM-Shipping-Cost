/**
 * @NApiVersion 2.1
 */

/***********************************************************************
 * Description:  This Script will work for Calculating Shipping Cost on Sales Order Record 
 * based on Conditions like Mattress Landed is Checked or Not on Customer and Item Record, 
 * Item Types included are Inventory Items or Assembly/bill Items or Kit Items and other 
 * Items are Excluded from the Calculation, "EXCLUDED FROM NEW FREIGHT MODEL" checkbox is 
 * Checked or Not, Shipping Method is Custom or Not and based on this Conditions it will 
 * Calculate Shipping Subtotal from the Total Item Amount and based on Shipping Subtotal 
 * and State it will map Search Percentage from "New Freight Model_1" Custom Record and 
 * then Calculating Shipping Cost and Set on Shipping Cost Field.      
 
 * Version: 1.0.0 - Initial version
 * Author:  Green Business/Palavi Rajgude
 * Date:    08-02-2022
 
 ***********************************************************************/

define(["N/search"], function (search) {
  return {
    //function for calculating subtotal for mattress landed on customer and line item type and line item mattress landed
    subtotalForMattressLanded: function (loadTransactionRecord) {
      try {
        var shippingCostSubtotal = 0;

        //get value from "Mattress Landed" checkbox
        var mattressSalesOrder = loadTransactionRecord.getValue({
          fieldId: "custbody_gbs_sale_mattress_land",
        });

        //get line item count from sales order record
        var lineCountItem = loadTransactionRecord.getLineCount({
          sublistId: "item",
        });

        //loop for iterating line item count in sales order record
        for (var i = 0; i < lineCountItem; i++) {
          //get item id from line item in sales order record
          var itemId = loadTransactionRecord.getSublistValue({
            sublistId: "item",
            fieldId: "item",
            line: i,
          });

          //get line item type from sales order record
          var itemType = search.lookupFields({
            type: search.Type.ITEM,
            id: itemId,
            columns: ["type"],
          });

          //if "Mattress Landed" checkbox value is true on sales order record then check "Mattress Landed" checkbox value is false on line item and checking line item type from sales order record
          if (mattressSalesOrder == true) {
            //get "Mattress Landed" checkbox value from line item
            var lineItemMattress = loadTransactionRecord.getSublistValue({
              sublistId: "item",
              fieldId: "custcol_gbs_sale_line_mattress_land",
              line: i,
            });

            //if "Mattress Landed" checkbox value is false on line item then check item type from sales order
            if (lineItemMattress == false) {
              //if line item type is assembly/bill or inventory or kit/package item then calculate subtotal from line item amount
              if (
                itemType.type[0].value == "Assembly" ||
                itemType.type[0].value == "InvtPart" ||
                itemType.type[0].value == "Kit"
              ) {
                shippingCostSubtotal =
                  shippingCostSubtotal +
                  loadTransactionRecord.getSublistValue({
                    sublistId: "item",
                    fieldId: "amount",
                    line: i,
                  });
              }
            }
          }

          //else if "Mattress Landed" checkbox value is false on sales order record then check line item type
          else if (mattressSalesOrder == false) {
            //if line item type is assembly/bill or inventory or kit/package item then calculate subtotal from line item amount
            if (
              itemType.type[0].value == "Assembly" ||
              itemType.type[0].value == "InvtPart" ||
              itemType.type[0].value == "Kit"
            ) {
              shippingCostSubtotal =
                shippingCostSubtotal +
                loadTransactionRecord.getSublistValue({
                  sublistId: "item",
                  fieldId: "amount",
                  line: i,
                });
            }
          }
        }
        return shippingCostSubtotal;
      } catch (error) {
        log.debug(
          "error in subtotalForMattressLanded() function",
          error.toString()
        );
      }
    },

    //function for getting percent from saved search by subtotal and state
    getPercentFromState: function (
      shippingCostSubtotal,
      loadTransactionRecord,
      stateOnSubRecord,
     
    ) {
      try {
  
        shippingCostSubtotal = parseFloat(shippingCostSubtotal);

        //create a search for get percentage based on state and subtotal amount
        var percentResultSavedSearch = search.create({
          type: "customrecord_gbs_nfm",
          filters: [
            ["custrecord_gbs_nfm1_state", "startswith", stateOnSubRecord],
            "AND",
            ["custrecord_gbs_nfm1_lor", "lessthan", shippingCostSubtotal],
            "AND",
            ["custrecord_gbs_nfm1_upr", "greaterthan", shippingCostSubtotal],
          ],
          columns: [
            search.createColumn({
              name: "custrecord_gbs_nfm1_percen",
              label: "Percentage",
            }),
            search.createColumn({
              name: "scriptid",
              sort: search.Sort.ASC,
              label: "Script ID",
            }),
            search.createColumn({
              name: "custrecord_gbs_nfm1_state",
              label: "State",
            }),
            search.createColumn({
              name: "custrecord_gbs_nfm1_country",
              label: "Country",
            }),
            search.createColumn({
              name: "custrecord_gbs_nfm1_upr",
              label: "Upper Range",
            }),
            search.createColumn({
              name: "custrecord_gbs_nfm1_lor",
              label: "Lower Range",
            }),
          ],
        });

        percentResultSavedSearch.run().each(function (result) {
          //get percent value from saved search
          var percentFromSavedSearch = result.getValue(
            "custrecord_gbs_nfm1_percen"
          );

          //if state is not present on shipping address then script will not calculate shipping cost
          if (stateOnSubRecord == "") {
            //set percent value on "PERCENTAGE FOR NEW FREIGHT CALCULATION" field
            loadTransactionRecord.setValue({
              fieldId: "custbody_gbs_sale_percent_freight_calc",
              value: 0,
            });

            loadTransactionRecord.setValue({
              fieldId: "custbody_gbs_sale_subtotal_freight_cal",
              value: 0,
            });
          } else {
            if (
              percentFromSavedSearch != "" &&
              percentFromSavedSearch != null &&
              percentFromSavedSearch != undefined
            ) {
              //set percent value on "PERCENTAGE FOR NEW FREIGHT CALCULATION" field
              loadTransactionRecord.setValue({
                fieldId: "custbody_gbs_sale_percent_freight_calc",
                value: parseFloat(percentFromSavedSearch),
              });
            }
          }
        });
      } catch (error) {
        log.debug("error in getPercentFromState() function", error.toString());
      }
    },

    //function for calculating shipping cost using subtotal and percent and set on shipping cost field
    shippingCost: function (shippingCostSubtotal, loadTransactionRecord) {
      try {
        var getPercentFreight = loadTransactionRecord.getValue({
          fieldId: "custbody_gbs_sale_percent_freight_calc",
        });

        log.debug('percent',getPercentFreight);

        //calculate shipping cost based on multplication of subtotal and percent value
        var calculateShippingCost =
          shippingCostSubtotal * (getPercentFreight / 100);

        //set shipping cost on "SHIPPING COST" field
        loadTransactionRecord.setValue({
          fieldId: "shippingcost",
          value: calculateShippingCost,
        });
      } catch (error) {
        log.debug("error in shippingCost() function", error.toString());
      }
    },

    chargeActualShippingIF: function (loadTransactionRecord) {
      try {
        var getShiphawkPrice = loadTransactionRecord.getValue({
          fieldId: "custbody_shiphawk_shipping_price",
        });

       
        loadTransactionRecord.setValue({
          fieldId: "shippingcost",
          value: getShiphawkPrice,
        });
      
        var getShiphawkCost = loadTransactionRecord.getValue({
          fieldId: "custbody_shiphawk_shipping_cost",
        });

        loadTransactionRecord.setValue({
          fieldId: "custbody_actual_ship_cost",
          value: getShiphawkCost,
        });
      } catch (error) {
        log.debug(
          "error in chargeActualShippingIF() function",
          error.toString()
        );
      }
    },
  };
});
