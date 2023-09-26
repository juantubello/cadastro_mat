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
          var oData =
            oView.getBindingContext().oModel.oData[
            oEvent.getParameter("arguments").id
            ];

          oView.setModel(new JSONModel(oData), "cad");

          this.setVisibleNextStage(oData.NextStage)

          //Fill eng

          const key = this.extractMaterialId(window.decodeURIComponent(oEvent.getParameter("arguments").id))
          const oService = this.getView().getModel()
          let oMaterialId = this.createFilter("IdProc", key);
          let oEngenharia = this.getOwnerComponent().getModel("engenharia")
          oEngenharia.setData({})
          oEngenharia.refresh

          oService.read("/Engenharia", {
            filters: [oMaterialId],
            success: function (res) {
              console.log(res.results[0])
              if (res.results.length > 0) {
                oEngenharia.setData(res.results[0])
              }
            },
            error: function (err) {
              // reject(err);
            }
          });

          var func = "";
          console.log(that.getView().getModel("newModel"))
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

              func = "ANALISTA"; // FOR TESTING

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
          debugger
          this.setEditNextStage(true)
          this.switchProp(false);
        },
        savePress: function () {
          this.setEditNextStage(false)
          this.changeFormMode(false)
          var oView = this.getView();
          var oCad = oView.getModel("cad");
          var oData = {
            d: oView.getBindingContext().oModel.oData[
              oView.getBindingContext().sPath.substring(1)
            ],
          };

          MessageBox.confirm("Deseja salvar o ajuste da Informação?", {
            title: "Alteração de Cadastro",
            onClose: function (oAction) {
              if (oAction == "OK") {
                delete oData.d.__metadata;

                oView
                  .getModel()
                  .update(oView.getBindingContext().sPath, oData, {
                    success: function (oData, response) {
                      oView.getModel().read(oView.getBindingContext().sPath, {
                        success: function (oData, response) {
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

          MessageBox.confirm("Deseja retornar a solicitação para o Usuário?", {
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
              stages.suprimentos = true
              break
          }
          stagesModel.setProperty("/editable", stages)
        }
      }
    );
  }
);
