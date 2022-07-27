/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

/***********************************************************************
 * Description:  This Script will work for Calculating Shipping Cost on Sales Order Record
 * based on Conditions like Mattress Landed is Checked or Not on Customer and Item Record,
 * Item Types included are Inventory Items or Assembly/bill Items or Kit Items and other
 * Items are Excluded from the Calculation, "EXCLUDED FROM NEW FREIGHT MODEL" checkbox is
 * Checked or Not, Shipping Method is Custom or Not and based this Conditions it will
 * Calculate Shipping Subtotal from the Total Item Amount and based on Shipping Subtotal
 * and State it will map Search Percentage from "New Freight Model_1" Custom Record and
 * then Calculating Shipping Cost and Set on Shipping Cost Field.
 *
 * Version: 1.0.0 - Initial version
 * Author:  Green Business/Palavi Rajgude
 * Date:    08-02-2022
 *
 ***********************************************************************/

define(["N/search", "N/runtime", "N/record"], function (
  search,
  runtime,
  record
) {
  //function for calculating shipping cost on sales order by checking mattress landed and item type
  function shippingCostFreightCalculation(context) {
    try {
      var calculateShippingCostScript = runtime.getCurrentScript();

      var loadSalesOrder = context.newRecord;

      var recordType = loadSalesOrder.type;

      //check pop sales order form id
      var checkPopFormId = calculateShippingCostScript.getParameter({
        name: "custscript_gbs_form_id"
      });

      var checkInvoiceFormId = calculateShippingCostScript.getParameter({
        name: "custscript_gbs_invoice_form_id"
      });

      //get pop sales order form
      var checkPopForm = loadSalesOrder.getValue({
        fieldId: "customform"
      });

      var runShippingCostObject = {
        loadSalesOrder: loadSalesOrder,
        calculateShippingCostScript: calculateShippingCostScript,
        recordType: recordType
      };

      //condition for check pop form is not select by user
      if (checkPopForm != checkPopFormId && recordType == "salesorder") {
        runShippingCostCalculation(runShippingCostObject);
      } else if (
        checkPopForm != checkInvoiceFormId &&
        recordType == "invoice"
      ) {
        runShippingCostCalculation(runShippingCostObject);
      } else if (recordType == "itemfulfillment") {
        getAmountItemFulfillment(runShippingCostObject);

        //runShippingCostCalculation(runShippingCostObject);
      }
    } catch (error) {
      log.debug(
        "Error in shippingCostFreightCalculation() function",
        error.toString()
      );
    }
  }

  function getAmountItemFulfillment(runShippingCostObject) {
    try {
      var { loadSalesOrder, calculateShippingCostScript, recordType } =
        runShippingCostObject;

      //get "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value
      var checkExcludeFreightModel = loadSalesOrder.getValue({
        fieldId: "custbody_gbs_excluded_sale_freight_mod"
      });

      var checkManualFreightCost = loadSalesOrder.getValue({
        fieldId: "custbody_gbs_invoice_manual_freight_co"
      });

      //check "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value for exclude calculation of shipping cost
      if (checkExcludeFreightModel != true) {
        //get shipping method from sales order record
        var checkShippingMethod = loadSalesOrder.getValue({
          fieldId: "shipmethod"
        });

        if (checkManualFreightCost != true) {
          //check "Custom" shipping method id
          var checkShippingMethodId = calculateShippingCostScript.getParameter({
            name: "custscript_gbs_shipping_method_id"
          });

          //condition for check shipping method is "Custom"
          if (checkShippingMethod == checkShippingMethodId) {
            var shippingCostSubtotal = 0;

            //get value from "Mattress Landed" checkbox
            var mattressSalesOrder = loadSalesOrder.getValue({
              fieldId: "custbody_gbs_sale_mattress_land"
            });

            var createFromItemFul = loadSalesOrder.getValue({
              fieldId: "createdfrom"
            });

            log.debug("createdfrom", createFromItemFul);

            var lineCountItem = loadSalesOrder.getLineCount({
              sublistId: "item"
            });

            var loadSo = record.load({
              type: record.Type.SALES_ORDER,
              id: createFromItemFul
            });

            for (var i = 0; i < lineCountItem; i++) {
              var itemIdOnItemFulfill = loadSalesOrder.getSublistValue({
                sublistId: "item",
                fieldId: "item",
                line: i
              });

              var itemFulfillLine = loadSo.findSublistLineWithValue({
                sublistId: "item",
                fieldId: "item",
                value: itemIdOnItemFulfill
              });

              log.debug("item fulfilment line", itemFulfillLine);

              //get line item type from sales order record
              var itemType = search.lookupFields({
                type: search.Type.ITEM,
                id: itemIdOnItemFulfill,
                columns: ["type"]
              });

              log.debug("item type", itemType);

              if (mattressSalesOrder == true) {
                //get "Mattress Landed" checkbox value from line item
                var lineItemMattress = loadSalesOrder.getSublistValue({
                  sublistId: "item",
                  fieldId: "custcol_gbs_sale_line_mattress_land",
                  line: i
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
                      loadSo.getSublistValue({
                        sublistId: "item",
                        fieldId: "amount",
                        line: itemFulfillLine
                      });

                    log.debug("shipping cost subtotal", shippingCostSubtotal);
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

                  log.debug("shipping cost subtotal", shippingCostSubtotal);
                }
              }
            }
          }
        }
      }

      var saveSub = loadSalesOrder.setValue({
        fieldId: "custbody_gbs_sale_subtotal_freight_cal",
        value: shippingCostSubtotal
      });

      log.debug("save", saveSub);

      shippingCost(shippingCostSubtotal, loadSalesOrder);
    } catch (error) {
      log.debug(
        "error in getAmountItemFulfillment() function",
        error.toString()
      );
    }
  }

  function runShippingCostCalculation(runShippingCostObject) {
    var { loadSalesOrder, calculateShippingCostScript, recordType } =
      runShippingCostObject;

    var shippingCostSubtotal = 0;

    //get "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value
    var checkExcludeFreightModel = loadSalesOrder.getValue({
      fieldId: "custbody_gbs_excluded_sale_freight_mod"
    });

    var checkManualFreightCost = loadSalesOrder.getValue({
      fieldId: "custbody_gbs_invoice_manual_freight_co"
    });

    //check "EXCLUDED FROM NEW FREIGHT MODEL" checkbox value for exclude calculation of shipping cost
    if (checkExcludeFreightModel != true) {
      //get shipping method from sales order record
      var checkShippingMethod = loadSalesOrder.getValue({
        fieldId: "shipmethod"
      });

      if (checkManualFreightCost != true) {
        //check "Custom" shipping method id
        var checkShippingMethodId = calculateShippingCostScript.getParameter({
          name: "custscript_gbs_shipping_method_id"
        });

        //condition for check shipping method is "Custom"
        if (checkShippingMethod == checkShippingMethodId) {
          //sales order record data pass to "subtotalForMattressLanded" function
          shippingCostSubtotal = subtotalForMattressLanded(loadSalesOrder);
          shippingCostSubtotal = parseFloat(shippingCostSubtotal);

          //set shipping cost subtotal value on "SUBTOTAL FOR NEW FREIGHT CALCULATION" field
          loadSalesOrder.setValue({
            fieldId: "custbody_gbs_sale_subtotal_freight_cal",
            value: shippingCostSubtotal
          });

          //shipping cost subtotal and sales order record data pass to "getPercentFromState" function
          if (recordType == "salesorder") {
            getPercentFromState(shippingCostSubtotal, loadSalesOrder);
          }

          //shipping cost subtotal and sales order record data pass to "shippingCost" function
          shippingCost(shippingCostSubtotal, loadSalesOrder);
        }
      }
    }
  }

  //function for calculating subtotal for mattress landed on customer and line item type and line item mattress landed
  function subtotalForMattressLanded(loadSalesOrder) {
    try {
      var shippingCostSubtotal = 0;

      //get value from "Mattress Landed" checkbox
      var mattressSalesOrder = loadSalesOrder.getValue({
        fieldId: "custbody_gbs_sale_mattress_land"
      });

      //get line item count from sales order record
      var lineCountItem = loadSalesOrder.getLineCount({
        sublistId: "item"
      });

      //loop for iterating line item count in sales order record
      for (var i = 0; i < lineCountItem; i++) {
        //get item id from line item in sales order record
        var itemId = loadSalesOrder.getSublistValue({
          sublistId: "item",
          fieldId: "item",
          line: i
        });

        //get line item type from sales order record
        var itemType = search.lookupFields({
          type: search.Type.ITEM,
          id: itemId,
          columns: ["type"]
        });

        //if "Mattress Landed" checkbox value is true on sales order record then check "Mattress Landed" checkbox value is false on line item and checking line item type from sales order record
        if (mattressSalesOrder == true) {
          //get "Mattress Landed" checkbox value from line item
          var lineItemMattress = loadSalesOrder.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_gbs_sale_line_mattress_land",
            line: i
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
                loadSalesOrder.getSublistValue({
                  sublistId: "item",
                  fieldId: "amount",
                  line: i
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
              loadSalesOrder.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i
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
  }

  //function for getting percent from saved search by subtotal and state
  function getPercentFromState(shippingCostSubtotal, loadSalesOrder) {
    try {
      shippingCostSubtotal = parseFloat(shippingCostSubtotal);

      //todo if condition for check shipping cost subtotal is greater than 0
      //get shipping address from sales order
      var shipaddrSubRecord = loadSalesOrder.getSubrecord({
        fieldId: "shippingaddress"
      });

      //get "state" from shipping address subrecord
      var stateOnSubRecord = shipaddrSubRecord.getValue({ fieldId: "state" });

      //if state is not present on shipping address then script will not calculate shipping cost
      if (stateOnSubRecord == "") {
        return false;
      }

      //create a search for get percentage based on state and subtotal amount
      var percentResultSavedSearch = search.create({
        type: "customrecord_gbs_nfm",
        filters: [
          ["custrecord_gbs_nfm1_state", "startswith", stateOnSubRecord],
          "AND",
          ["custrecord_gbs_nfm1_lor", "lessthan", shippingCostSubtotal],
          "AND",
          ["custrecord_gbs_nfm1_upr", "greaterthan", shippingCostSubtotal]
        ],
        columns: [
          search.createColumn({
            name: "custrecord_gbs_nfm1_percen",
            label: "Percentage"
          }),
          search.createColumn({
            name: "scriptid",
            sort: search.Sort.ASC,
            label: "Script ID"
          }),
          search.createColumn({
            name: "custrecord_gbs_nfm1_state",
            label: "State"
          }),
          search.createColumn({
            name: "custrecord_gbs_nfm1_country",
            label: "Country"
          }),
          search.createColumn({
            name: "custrecord_gbs_nfm1_upr",
            label: "Upper Range"
          }),
          search.createColumn({
            name: "custrecord_gbs_nfm1_lor",
            label: "Lower Range"
          })
        ]
      });

      percentResultSavedSearch.run().each(function (result) {
        //get percent value from saved search
        var percentFromSavedSearch = result.getValue(
          "custrecord_gbs_nfm1_percen"
        );

        //set percent value on "PERCENTAGE FOR NEW FREIGHT CALCULATION" field
        loadSalesOrder.setValue({
          fieldId: "custbody_gbs_sale_percent_freight_calc",
          value: parseFloat(percentFromSavedSearch)
        });
      });
    } catch (error) {
      log.debug("error in getPercentFromState() function", error.toString());
    }
  }

  //function for calculating shipping cost using subtotal and percent and set on shipping cost field
  function shippingCost(shippingCostSubtotal, loadSalesOrder) {
    try {
      var getPercentFreight = loadSalesOrder.getValue({
        fieldId: "custbody_gbs_sale_percent_freight_calc"
      });

      log.debug("getPercentFreight get on beforesubmit", getPercentFreight);

      //calculate shipping cost based on multplication of subtotal and percent value
      var calculateShippingCost =
        shippingCostSubtotal * (getPercentFreight / 100);

      //set shipping cost on "SHIPPING COST" field
      loadSalesOrder.setValue({
        fieldId: "shippingcost",
        value: calculateShippingCost
      });
    } catch (error) {
      log.debug("error in shippingCost() function", error.toString());
    }
  }

  return {
    beforeSubmit: shippingCostFreightCalculation
  };
});
