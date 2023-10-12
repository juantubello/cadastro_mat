sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/FilterOperator",
  ],
  function (Controller, UIComponent, History, JSONModel, MessageBox, FilterOperator) {
    "use strict";
    let base = this;

    return Controller.extend(
      "br.com.fortlev.cadmaterial.cadmaterial.controller.Detalhes",
      {
        onInit: function (oEvent) {
          //this.getOwnerComponent().getModel("invoice").getData().Invoices[0]
          var oView = this.getView();
          var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
          oRouter
            .getRoute("detalhes")
            .attachPatternMatched(this._onObjectMatched, this);

          var newModel = new JSONModel({
            aprov: false,
            edit: false,
            save: false,
            estorn: false,
            retorn: false,
          });
          oView.setModel(newModel, "global");

          var newModel1 = new JSONModel({
            edit: false,
            save: false,
            editable: false,
          });
          oView.setModel(newModel1, "newModel");
        },
        createFilter: function (sField, sValue) {
          let oFiltro = new sap.ui.model.Filter({
            path: sField,
            operator: FilterOperator.EQ,
            value1: sValue
          });
          return oFiltro;
        },
        _onObjectMatched: function (oEvent) {
          const that = this
          this.getView().bindElement({
            path:
              "/" +
              window.decodeURIComponent(oEvent.getParameter("arguments").id),
          });

          var oView = this.getView();

          let hasContext = oView.getBindingContext() ? true : false
          if (!hasContext) {
            let initRouter = sap.ui.core.UIComponent.getRouterFor(this);
            let oHistory = History.getInstance();
            let sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
              window.history.go(-1);
            } else {
              initRouter.navTo("interno");
            }
          }

          var oData =
            oView.getBindingContext().oModel.oData[
            oEvent.getParameter("arguments").id
            ];

          oView.setModel(new JSONModel(oData), "cad");

          this.setVisibleNextStage(oData.NextStage)

          var func = "";
          oView.getModel().read("/GetUserFunc", {
            success: function (oQueryResult) {
              func = oQueryResult.Func;
              oView.setModel(new JSONModel(oQueryResult), "user");

              var newModel = {
                aprov: false,
                edit: false,
                save: false,
                estorn: false,
                retorn: false,
              };

              // func = "ANALISTA"; // FOR TESTING

              if (
                oData.Status != "APROVADO" &&
                oData.Status != "CANCELADO" &&
                oData.Status != "ENVIO ERP"
              ) {
                switch (func) {
                  case "SOLICIT":
                    if (
                      oData.Status == "NOVO" ||
                      oData.Status == "ALTERADO PELO SOLICITANTE" ||
                      oData.Status == "PENDENTE RETORNO"
                    ) {
                      newModel.edit = true;
                      newModel.save = true;
                    }
                    newModel.estorn = true;
                    break;
                  case "ANALISTA":
                    newModel.retorn = true;
                    newModel.edit = true;
                    newModel.save = true;
                    break;
                  case "APROVADOR":
                    newModel.aprov = true;
                    newModel.edit = true;
                    newModel.save = true;
                    newModel.estorn = true;
                    newModel.retorn = true;
                    break;
                }
              }
              oView.setModel(new JSONModel(newModel), "global");
              oView.getModel("newModel").setData(newModel);
            },
          });

          //Fill eng

          const key = this.extractMaterialId(window.decodeURIComponent(oEvent.getParameter("arguments").id))
          let oEngenharia = this.getOwnerComponent().getModel("engenharia")
          oEngenharia.setData({})
          oEngenharia.refresh

          this.getDataFromStage("/Engenharia", key, oData.NextStage).then(response => {
            oEngenharia.setData(response)
          })

          //Due to autorization check, we hide the section model, and only display it in case, that
          // the user has role. 
          const stagesModel = that.getOwnerComponent().getModel("stagesModel")
          stagesModel.setProperty("/visible/controladoria", false)
          stagesModel.setProperty("/visible/suprimentos", false)

          let oControladoria = this.getOwnerComponent().getModel("controladoria")
          oControladoria.setData({})
          oControladoria.refresh
          if (oData.NextStage >= 4) {
            this.getDataFromStage("/Controladoria", key, oData.NextStage).then(response => {
              oControladoria.setData(response)
              stagesModel.setProperty("/visible/controladoria", true)
            })
          }

          let oSuprimentos = this.getOwnerComponent().getModel("suprimentos")
          oSuprimentos.setData({})
          oSuprimentos.refresh
          if (oData.NextStage >= 5) {
            this.getDataFromStage("/Suprimentos", key, oData.NextStage).then(response => {
              oSuprimentos.setData(response)
              stagesModel.setProperty("/visible/suprimentos", true)
            })
          }

        },
        extractMaterialId: function (cadena) {
          const expresionRegular = /\(([^)]+)\)/;
          const coincidencia = cadena.match(expresionRegular);

          if (coincidencia) {
            return coincidencia[1]; // Devuelve el contenido entre paréntesis
          } else {
            return null; // Retorna null si no se encontraron paréntesis con contenido
          }
        },

        onNavBack: function () {
          var oHistory = History.getInstance();
          var sPrevHash = oHistory.getPreviousHash();
          this.switchProp(true);

          if (sPrevHash !== undefined) {
            window.history.go(-1);
          } else {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("interno");
          }
        },
        aprovPress: function () {
          var oView = this.getView();
          var oCad = oView.getModel("cad");
          var oData = {
            d: oView.getBindingContext().oModel.oData[
              oView.getBindingContext().sPath.substring(1)
            ],
          };

          MessageBox.confirm(
            "Deseja iniciar a integração do Cadastro de Material? Após a aprovação, não será possível alterar o fluxo",
            {
              title: "Confirmação de Cadastro",
              onClose: function (oAction) {
                if (oAction == "OK") {
                  delete oData.d.__metadata;

                  oData.d.Status = "ENVIO ERP";

                  oView
                    .getModel()
                    .update(oView.getBindingContext().sPath, oData, {
                      success: function (oData, response) {
                        oView.getModel().read(oView.getBindingContext().sPath, {
                          success: function (oData, response) {
                            MessageBox.success(
                              "Processo de integração iniciado com sucesso!"
                            );
                            oView.setModel(new JSONModel(oData), "cad");

                            oView.setModel(
                              new JSONModel({
                                aprov: false,
                                edit: false,
                                save: false,
                                estorn: false,
                                retorn: false,
                              }),
                              "global"
                            );

                            oView
                              .getModel("newModel")
                              .setProperty("/edit", true);
                            oView
                              .getModel("newModel")
                              .setProperty("/save", false);
                            oView
                              .getModel("newModel")
                              .setProperty("/editable", false);

                            let oHistory = History.getInstance();
                            let sPrevHash = oHistory.getPreviousHash();

                            if (sPrevHash !== undefined) {
                              window.history.go(-1);
                            } else {
                              oRouter.navTo("interno");
                            }
                          },

                          error: function (oError) {
                            MessageBox.error(
                              "Ocorreu um erro ao atualizar a Solicitação! Retornando para tela inicial!",
                              {
                                onClose: function (oAction) {
                                  oRouter.navTo("interno");
                                },
                              }
                            );
                          },
                        });
                      },

                      error: function (oError) {
                        MessageBox.error(
                          "Ocorreu um erro ao atualizar a Solicitação! Tente novamente mais tarde!"
                        );
                      },
                    });
                }
              },
            }
          );
        },
        editPress: function () {
          this.setEditNextStage(true)
          this.switchProp(false);
        },
        savePress: function () {
          const that = this
          var oView = this.getView();
          var oCad = oView.getModel("cad");
          var oData = {
            d: oView.getBindingContext().oModel.oData[
              oView.getBindingContext().sPath.substring(1)
            ],
          };

          //Validate Eng fields
          let stagesModel = this.getOwnerComponent().getModel("stagesModel").getData()
          let editableStage = stagesModel.editable
          let stage = this.getStageToSave(editableStage)

          if (stage === null || stage === undefined || stage === "") {
            this.setEditNextStage(true)
            this.switchProp(false);
            stagesModel = this.getOwnerComponent().getModel("stagesModel").getData()
            editableStage = stagesModel.editable
            stage = this.getStageToSave(editableStage)
          }

          if (stage === "engenharia") {
            let engenhariaData = that.getOwnerComponent().getModel("engenharia").getData()
            const response = that.validateMandatoryFields("Engenharia", engenhariaData)

            if (response.emptyFields) {
              MessageBox.error(
                response.message
              );
              return
            }
          }

          if (stage === "fiscal") {
            let fiscalData = that.getView().getModel("cad").getData()
            const response = that.validateMandatoryFields("Fiscal", fiscalData)

            if (response.emptyFields) {
              MessageBox.error(
                response.message
              );
              return
            }
          }

          if (stage === "controladoria") {
            let controladoriaData = that.getOwnerComponent().getModel("controladoria").getData()
            const response = that.validateMandatoryFields("Controladoria", controladoriaData)

            if (response.emptyFields) {
              MessageBox.error(
                response.message
              );
              return
            }
          }

          MessageBox.confirm("Deseja salvar o ajuste da Informação?", {
            title: "Alteração de Cadastro",
            onClose: function (oAction) {
              if (oAction == "OK") {
                delete oData.d.__metadata;
                oData.d.Status = "SAVE";
                oView
                  .getModel()
                  .update(oView.getBindingContext().sPath, oData, {
                    success: function (oData, response) {

                      oView.getModel().read(oView.getBindingContext().sPath, {
                        success: async function (oData, response) {
                          await that.updateStage(oData.IdProc)
                          MessageBox.success(
                            "Solicitação atualizada com sucesso!"
                          );
                          oView.setModel(new JSONModel(oData), "cad");

                          oView.getModel("newModel").setProperty("/edit", true);
                          oView
                            .getModel("newModel")
                            .setProperty("/save", false);
                          oView
                            .getModel("newModel")
                            .setProperty("/editable", false);

                          that.setEditNextStage(false)
                          let oHistory = History.getInstance();
                          let sPrevHash = oHistory.getPreviousHash();

                          if (sPrevHash !== undefined) {
                            window.history.go(-1);
                          } else {
                            oRouter.navTo("interno");
                          }
                        },

                        error: function (oError) {
                          MessageBox.error(
                            "Ocorreu um erro ao atualizar os dados! Retornando para tela inicial!",
                            {
                              onClose: function (oAction) {
                                that.setEditNextStage(false)
                                oRouter.navTo("interno");
                              },
                            }
                          );
                        },
                      });
                    },

                    error: function (oError) {
                      MessageBox.error(
                        "Ocorreu um erro ao atualizar a Solicitação. Tente novamente mais tarde!"
                      );
                    },
                  });
              }
            },
          });
        },

        cancPress: function () {
          var oView = this.getView();
          var oRouter = UIComponent.getRouterFor(this);

          MessageBox.confirm(
            "Deseja cancelar as alterações? Alterações não salvas serão perdidas!",
            {
              title: "Alteração de Cadastro",
              onClose: function (oAction) {
                if (oAction == "OK") {
                  oView.getModel().read(oView.getBindingContext().sPath, {
                    success: function (oData, response) {
                      oView.setModel(new JSONModel(oData), "cad");

                      oView.getModel("newModel").setProperty("/edit", true);
                      oView.getModel("newModel").setProperty("/save", false);
                      oView
                        .getModel("newModel")
                        .setProperty("/editable", false);
                      let oHistory = History.getInstance();
                      let sPrevHash = oHistory.getPreviousHash();

                      if (sPrevHash !== undefined) {
                        window.history.go(-1);
                      } else {
                        oRouter.navTo("interno");
                      }
                    },

                    error: function (oError) {
                      MessageBox.error(
                        "Ocorreu um erro ao atualizar os dados! Retornando para tela inicial!",
                        {
                          onClose: function (oAction) {
                            oRouter.navTo("interno");
                          },
                        }
                      );
                    },
                  });
                }
              },
            }
          );
        },

        estornPress: function () {
          var oView = this.getView();
          var oCad = oView.getModel("cad");
          var oData = {
            d: oView.getBindingContext().oModel.oData[
              oView.getBindingContext().sPath.substring(1)
            ],
          };

          MessageBox.confirm(
            "Deseja estornar a solicitação de Cadastro de Material? Após o estorno, não será possível recuperar o fluxo",
            {
              title: "Estorno de Solicitação de Cadastro",
              onClose: function (oAction) {
                if (oAction == "OK") {
                  delete oData.d.__metadata;

                  oData.d.Status = "CANCELADO";

                  oView
                    .getModel()
                    .update(oView.getBindingContext().sPath, oData, {
                      success: function (oData, response) {
                        oView.getModel().read(oView.getBindingContext().sPath, {
                          success: function (oData, response) {
                            MessageBox.success(
                              "Solicitação estornada com sucesso!"
                            );
                            oView.setModel(new JSONModel(oData), "cad");

                            oView.setModel(
                              new JSONModel({
                                aprov: false,
                                edit: false,
                                save: false,
                                estorn: false,
                                retorn: false,
                              }),
                              "global"
                            );

                            oView
                              .getModel("newModel")
                              .setProperty("/edit", true);
                            oView
                              .getModel("newModel")
                              .setProperty("/save", false);
                            oView
                              .getModel("newModel")
                              .setProperty("/editable", false);
                          },

                          error: function (oError) {
                            MessageBox.error(
                              "Ocorreu um erro ao estornar a Solicitação! Retornando para tela inicial!",
                              {
                                onClose: function (oAction) {
                                  oRouter.navTo("interno");
                                },
                              }
                            );
                          },
                        });
                      },

                      error: function (oError) {
                        MessageBox.error(
                          "Ocorreu um erro ao estornar a Solicitação! Tente novamente mais tarde!"
                        );
                      },
                    });
                }
              },
            }
          );
        },

        retornPress: function () {
          var oView = this.getView();
          var oCad = oView.getModel("cad");
          var oData = {
            d: oView.getBindingContext().oModel.oData[
              oView.getBindingContext().sPath.substring(1)
            ],
          };

          const nextStage = this.getOwnerComponent().getModel("stagesModel").getProperty("/nextStage")
          let isSuprimentos = nextStage === 5 ? true : false
          if (!isSuprimentos) {

            MessageBox.confirm("Deseja retornar a solicitação?", {
              title: "Retorno de Solicitação de Cadastro",
              onClose: function (oAction) {
                if (oAction == "OK") {

                  delete oData.d.__metadata;

                  oData.d.Status = "PENDENTE RETORNO";

                  oView
                    .getModel()
                    .update(oView.getBindingContext().sPath, oData, {
                      success: function (oData, response) {
                        oView.getModel().read(oView.getBindingContext().sPath, {
                          success: function (oData, response) {
                            MessageBox.success(
                              "Solicitação retornada com sucesso!"
                            );
                            oView.setModel(new JSONModel(oData), "cad");

                            oView.getModel("newModel").setProperty("/edit", true);
                            oView
                              .getModel("newModel")
                              .setProperty("/save", false);
                            oView
                              .getModel("newModel")
                              .setProperty("/editable", false);

                            let oHistory = History.getInstance();
                            let sPrevHash = oHistory.getPreviousHash();

                            if (sPrevHash !== undefined) {
                              window.history.go(-1);
                            } else {
                              oRouter.navTo("interno");
                            }

                          },

                          error: function (oError) {
                            MessageBox.error(
                              "Ocorreu um erro ao atualizar a Solicitação! Retornando para tela inicial!",
                              {
                                onClose: function (oAction) {
                                  oRouter.navTo("interno");
                                },
                              }
                            );
                          },
                        });
                      },

                      error: function (oError) {
                        MessageBox.error(
                          "Ocorreu um erro ao atualizar a Solicitação! Tente novamente mais tarde!"
                        );
                      },
                    });
                }
              },
            });
          } else {
            const stageToGoBack = this.getOwnerComponent().getModel("returnModel").getData()
            if (stageToGoBack.hasOwnProperty("stage") && stageToGoBack.stage !== "") {
              MessageBox.confirm("Deseja retornar a solicitação?", {
                title: "Retorno de Solicitação de Cadastro",
                onClose: function (oAction) {
                  if (oAction == "OK") {

                    delete oData.d.__metadata;

                    oData.d.Status = "PENDENTE RETORNO";
                    oData.d.CurrentStage = parseInt(stageToGoBack.stage)
                    oData.d.isSuprimentos = true;
                    oView
                      .getModel()
                      .update(oView.getBindingContext().sPath, oData, {
                        success: function (oData, response) {
                          oView.getModel().read(oView.getBindingContext().sPath, {
                            success: function (oData, response) {
                              MessageBox.success(
                                "Solicitação retornada com sucesso!"
                              );
                              oView.setModel(new JSONModel(oData), "cad");

                              oView.getModel("newModel").setProperty("/edit", true);
                              oView
                                .getModel("newModel")
                                .setProperty("/save", false);
                              oView
                                .getModel("newModel")
                                .setProperty("/editable", false);

                              let oHistory = History.getInstance();
                              let sPrevHash = oHistory.getPreviousHash();

                              if (sPrevHash !== undefined) {
                                window.history.go(-1);
                              } else {
                                oRouter.navTo("interno");
                              }

                            },

                            error: function (oError) {
                              MessageBox.error(
                                "Ocorreu um erro ao atualizar a Solicitação! Retornando para tela inicial!",
                                {
                                  onClose: function (oAction) {
                                    oRouter.navTo("interno");
                                  },
                                }
                              );
                            },
                          });
                        },

                        error: function (oError) {
                          MessageBox.error(
                            "Ocorreu um erro ao atualizar a Solicitação! Tente novamente mais tarde!"
                          );
                        },
                      });
                  }
                },
              });
            } else {
              MessageBox.error(
                "Se a criação for devolvida a um movimento anterior, é necessário selecionar a fase do movimento para o qual a criação é devolvida."
              );
            }

          }
        },
        switchProp: function (bool) {
          var oView = this.getView();

          oView.getModel("newModel").setProperty("/edit", bool);
          oView.getModel("newModel").setProperty("/save", !bool);
          oView.getModel("newModel").setProperty("/editable", !bool);
        },
        setVisibleNextStage: function (stage) {
          const stagesModel = this.getOwnerComponent().getModel("stagesModel")
          let stages = {
            "dadosbasicos": true,
            "description": true,
            "engenharia": true,
            "fiscal": true,
            "controladoria": true,
            "suprimentos": true
          }

          let defaultEdit = {
            "dadosbasicos": false,
            "description": false,
            "engenharia": false,
            "fiscal": false,
            "controladoria": false,
            "suprimentos": false
          }

          switch (stage) {
            case 0:
              stages.controladoria = false
              stages.suprimentos = false
              stages.fiscal = false
              break
            case 1:
              stages.controladoria = false
              stages.suprimentos = false
              stages.fiscal = false
              break
            case 2:
              stages.controladoria = false
              stages.suprimentos = false
              stages.fiscal = false
              break
            case 3:
              stages.controladoria = false
              stages.suprimentos = false
              break
            case 4:
              stages.suprimentos = false
              break
            case 5:
              break
          }
          stagesModel.setProperty("/visible", stages)
          stagesModel.setProperty("/editable", defaultEdit)
          stagesModel.setProperty("/nextStage", stage)
        },

        setEditNextStage: function (isEditable, stage) {
          const stagesModel = this.getOwnerComponent().getModel("stagesModel")
          let newStage = stage ? stage : stagesModel.getProperty("/nextStage")

          let stages = {
            "dadosbasicos": false,
            "description": false,
            "engenharia": false,
            "fiscal": false,
            "controladoria": false,
            "suprimentos": false
          }

          if (!isEditable) {
            stagesModel.setProperty("/editable", stages)
            return
          }
          switch (newStage) {
            case 0:
              stages.dadosbasicos = true
              break
            case 1:
              stages.dadosbasicos = true
              stages.description = true
              break
            case 2:
              stages.engenharia = true
              break
            case 3:
              stages.fiscal = true
              break
            case 4:
              stages.controladoria = true
              break
            case 5:
              stages.dadosbasicos = true
              stages.description = true
              stages.suprimentos = true
              stages.engenharia = true
              stages.fiscal = true
              stages.controladoria = true
              break
          }
          stagesModel.setProperty("/editable", stages)
        },
        createEngenharia: async function (materialId) {
          sap.ui.core.BusyIndicator.show(0);
          let oModel = this.getOwnerComponent().getModel("engenharia").getData()
          oModel.IdProc = materialId
          const oService = this.getView().getModel()
          return new Promise(async (resolve, reject) => {
            oService.create("/Engenharia", oModel, {
              success: function (oModel, response) {
                sap.ui.core.BusyIndicator.hide();
                resolve("Engenharia actualizada")
              },

              error: function (oError) {
                sap.ui.core.BusyIndicator.hide();
                //oError - contains additional error information.
                reject("Error actualizando Engenharia")
              },
            });
          });
        },
        createControladoria: async function (materialId) {
          sap.ui.core.BusyIndicator.show(0);
          let oModel = this.getOwnerComponent().getModel("controladoria").getData()
          oModel.IdProc = materialId
          const oService = this.getView().getModel()
          return new Promise(async (resolve, reject) => {
            oService.create("/Controladoria", oModel, {
              success: function (oModel, response) {
                sap.ui.core.BusyIndicator.hide();
                resolve("Controladoria actualizada")
              },

              error: function (oError) {
                sap.ui.core.BusyIndicator.hide();
                //oError - contains additional error information.
                reject("Error actualizando Controladoria")
              },
            });
          });
        },
        createSuprimentos: async function (materialId) {
          sap.ui.core.BusyIndicator.show(0);
          let oModel = this.getOwnerComponent().getModel("suprimentos").getData()
          oModel.IdProc = materialId
          const oService = this.getView().getModel()
          return new Promise(async (resolve, reject) => {
            oService.create("/Suprimentos", oModel, {
              success: function (oModel, response) {
                sap.ui.core.BusyIndicator.hide();
                resolve("Suprimentos actualizada")
              },

              error: function (oError) {
                sap.ui.core.BusyIndicator.hide();
                //oError - contains additional error information.
                reject("Error actualizando Suprimentos")
              },
            });
          });
        },
        createFiscal: async function (materialId) {
          sap.ui.core.BusyIndicator.show(0);
          const oGeneralData = this.getView().getModel("cad").getData();
          let oFiscal = {
            "IdProc": materialId,
            "Steuc": oGeneralData.Steuc
          }
          const oService = this.getView().getModel()
          return new Promise(async (resolve, reject) => {
            oService.create("/Fiscal", oFiscal, {
              success: function (oFiscal, response) {
                sap.ui.core.BusyIndicator.hide();
                resolve("Fiscal actualizada")
              },

              error: function (oError) {
                sap.ui.core.BusyIndicator.hide();
                //oError - contains additional error information.
                reject("Error actualizando Fiscal")
              },
            });
          });
        },
        getStageToSave: function (objeto) {
          for (const propiedad in objeto) {
            if (objeto.hasOwnProperty(propiedad) && objeto[propiedad] === true) {
              return propiedad;
            }
          }
          return null; // Retorna null si no se encuentra ninguna propiedad con valor true.
        },
        updateStage: function (materialId) {
          const that = this
          let response;
          const nextStage = this.getOwnerComponent().getModel("stagesModel").getProperty("/nextStage")
          let isSuprimentos = nextStage === 5 ? true : false
          return new Promise(async (resolve, reject) => {
            const stagesModel = this.getOwnerComponent().getModel("stagesModel").getData()
            const editableStage = stagesModel.editable
            let stage = this.getStageToSave(editableStage)

            if (isSuprimentos) {
              stage = "suprimentos"
            }

            if (stage === "engenharia") {
              response = await that.createEngenharia(materialId)
            } else if (stage === "fiscal") {
              response = await that.createFiscal(materialId)
            }
            else if (stage === "controladoria") {
              response = await that.createControladoria(materialId)
            } else if (stage === "suprimentos") {

              response = await that.createEngenharia(materialId)
              response = await that.createFiscal(materialId)
              response = await that.createControladoria(materialId)
              response = await that.createSuprimentos(materialId)

            }
            resolve(response)
          });
        },
        validateMandatoryFields: function (section, jsonData) {
          let response = {
            emptyFields: false,
            message: ""
          }
          let campoDict
          if (section === "Engenharia") {

            campoDict = {
              "Descricao": "Descrição Curta",
              "DescricaoLonga": "Descrição Detalhada",
              "UnidMedida": "Unidade de medida",
              "Matkl": "Grupo de mercadoria",
              "TipoMaterial": "Tipo do Material",
              "Aplicacao": "Aplicação (utilização)",
              "Cor": "Cor",
              "Fabricante": "Fabricante",
              "RefFabricante": "Referência Fabricante",
              "Altura": "Altura",
              "Largura": "Largura",
              "Comprimento": "Comprimento",
              "Espessura": "Espessura",
              "DiameterRadio": "Diâmetro/Raio",
              "Tensao": "Tensão",
              "Amperagem": "Amperagem",
            }
          } else if (section === "Fiscal") {
            campoDict = {
              "Steuc": "NCM (TIPI)"
            }
          } else if (section === "Controladoria") {
            campoDict = {
              "ClasseAvaliacao": "Classe de Avaliação"
            }
          }
          const camposVacios = [];

          for (const campo in campoDict) {
            if (campoDict.hasOwnProperty(campo)) {
              if (!jsonData[campo] || jsonData[campo].trim() === "") {
                camposVacios.push(campoDict[campo]);
              }
            }
          }

          if (camposVacios.length === 0) {
            response.message = "Todos los campos están completos"
            return response
          } else if (camposVacios.length === 1) {
            response.message = `O campo ${camposVacios[0]} é obrigatório.`;
            response.emptyFields = true
            return response
          } else {
            const ultimoCampo = camposVacios.pop();
            const camposVaciosString = camposVacios.join(", ");
            response.message = `Os campos ${camposVaciosString} e ${ultimoCampo} são obrigatórios`;
            response.emptyFields = true
            return response
          }

        },
        getDataFromStage: function (entity, material, stage) {
          const that = this
          const oService = this.getView().getModel()
          return new Promise(async (resolve, reject) => {
            let oMaterialId = that.createFilter("IdProc", material);
            oService.read(entity, {
              filters: [oMaterialId],
              success: function (res) {
                if (res.results.length > 0) {
                  resolve(res.results[0])
                }
              },
              error: function (err) {
                reject("Auth error")
                let response = JSON.parse(err.responseText);
                MessageBox.error(response.error.message.value);
                const newModel = that.getView().getModel("global")
                newModel.setProperty("/aprov", false)
                newModel.setProperty("/save", false)
                newModel.setProperty("/edit", false)
                newModel.setProperty("/estorn", false)
                newModel.setProperty("/retorn", false)
              }
            });
          });
        }
      }
    );
  }
);
