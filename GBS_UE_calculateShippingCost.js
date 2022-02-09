/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(["N/search"], function (search) {

  //function for calculating shipping cost on sales order by checking mattress landed and item type
  function shippingCostFreightCalculation(context) {
    try {
      var loadSalesOrder = context.newRecord;
      var shippingCostSubtotal = 0;

      var checkPopForm = loadSalesOrder.getValue({
        fieldId: "customform",
      });

      if (checkPopForm != 176) {
        var checkExcludeFreightModel = loadSalesOrder.getValue({
          fieldId: "custbody_gbs_excluded_sale_freight_mod",
        });

        if (checkExcludeFreightModel != true) {
          var checkShippingMethod = loadSalesOrder.getValue({
            fieldId: "shipmethod",
          });

          if (checkShippingMethod == 110157) {


            shippingCostSubtotal = subtotalForMattressLanded(loadSalesOrder);

            getPercentFromState(shippingCostSubtotal, loadSalesOrder);

            shippingCost(shippingCostSubtotal, loadSalesOrder);
          }
        }
      }
    } catch (error) {
      log.debug(
        "Error in shippingCostFreightCalculation() function",
        error.toString()
      );
    }
  }

  //function for calculating subtotal for mattress landed on customer and line item type and line item mattress landed
  function subtotalForMattressLanded(loadSalesOrder) {

    try {
      var shippingCostSubtotal = 0;
      var mattressSalesOrder = loadSalesOrder.getValue({
        fieldId: "custbody_gbs_sale_mattress_land",
      });

      var lineCountItem = loadSalesOrder.getLineCount({
        sublistId: "item",
      });

      for (var i = 0; i < lineCountItem; i++) {
        var itemId = loadSalesOrder.getSublistValue({
          sublistId: "item",
          fieldId: "item",
          line: i,
        });

        var itemType = search.lookupFields({
          type: search.Type.ITEM,
          id: itemId,
          columns: ["type"],
        });

        if (mattressSalesOrder == true) {
          var lineItemMattress = loadSalesOrder.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_gbs_sale_line_mattress_land",
            line: i,
          });

          if (lineItemMattress == false) {
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
                  line: i,
                });
            }
          }
        } else if (mattressSalesOrder == false) {
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
                line: i,
              });
          }
        }
      }

      return shippingCostSubtotal;
    }
    catch (error) {
      log.debug(
        'error in subtotalForMattressLanded() function',
        error.toString()
      );
    }
  }


  //function for getting percent from saved search by subtotal and state
  function getPercentFromState(shippingCostSubtotal, loadSalesOrder) {

    try {

      var shipaddrSubRecord = loadSalesOrder.getSubrecord({
        fieldId: "shippingaddress",
      });


      var stateOnSubRecord = shipaddrSubRecord.getValue({ fieldId: "state" });


      shippingCostSubtotal = parseInt(shippingCostSubtotal);

      if (stateOnSubRecord == "") {

        return false;
      }

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
        var percentFromSavedSearch = result.getValue(
          "custrecord_gbs_nfm1_percen"
        );

        loadSalesOrder.setValue({
          fieldId: "custbody_gbs_sale_percent_freight_calc",
          value: parseInt(percentFromSavedSearch),
        });
      });

      loadSalesOrder.setValue({
        fieldId: "custbody_gbs_sale_subtotal_freight_cal",
        value: shippingCostSubtotal,
      });
    }
    catch (error) {
      log.debug('error in getPercentFromState() function', error.toString());
    }
  }

  //function for calculating shipping cost using subtotal and percent and set on shipping cost field
  function shippingCost(shippingCostSubtotal, loadSalesOrder) {
    try {
      var getPercentFreight = loadSalesOrder.getValue({
        fieldId: "custbody_gbs_sale_percent_freight_calc",
      });

      var calculateShippingCost =
        shippingCostSubtotal * (getPercentFreight / 100);

      loadSalesOrder.setValue({
        fieldId: "shippingcost",
        value: calculateShippingCost,
      });
    }
    catch (error) {
      log.debug('error in shippingCost() function', error.toString());
    }
  }

  return {
    beforeSubmit: shippingCostFreightCalculation,
  };
});
