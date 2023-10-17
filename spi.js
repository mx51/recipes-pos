var spiInstance;
const SpiVersion = "2.9.9" // Current SPI library version

// Define your terminal and POS related parameters before pairing a terminal
const posId = "Jpos"; // eg: TESTWBC
const serialNumber = "500-000-007"; // eg: 123-123-123
const eftposAddress = ""; // eg: 192.168.0.14 (not required if using Auto Address Resolution)
const posVersion = "7.1.3"; // eg: 7.9.2
const posName = "MiniPOS"; // eg: mx51

// Save secrets into local storage
var spiSecrets = JSON.parse(window.localStorage.getItem("secrets"));

// Instantiate the SPI library as an instance object
spiInstance = new window.mx51.Spi(posId, serialNumber, eftposAddress, spiSecrets);

/**
 * Sets values used to identify the POS software to the EFTPOS terminal.
 * Must be set before starting!
 *
 * @param posVendorId Vendor identifier of the POS itself.
 * @param posVersion  Version string of the POS itself.
 **/
spiInstance.SetPosInfo(posName, posVersion); // If not set, will get this error: Uncaught Error: Missing POS vendor ID and version. posVendorId and posVersion are required before starting

/**
 * Set the tenant code of your provider, please use the GetAvailableTenants method for a list of available tenants.
 * More information can be found here - https://developer.mx51.io/v2-spi/docs/setup#tenants
 *
 * @param tenantCode
 **/
spiInstance.SetTenantCode("gko");

/**
 * Set the api key used for auto address discovery feature
 * Integration Support will provide you with a Unique API key
 *
 * @param deviceApiKey
 **/
spiInstance.SetDeviceApiKey("UniqueAPIKeyProvidedByIntegrationTeam");

/**
 * Allows you to set the auto address discovery feature.
 *
 * @param autoAddressResolutionEnable
 **/
spiInstance.SetAutoAddressResolution(true);

/**
 * Set the client library to use secure web sockets TLS (wss protocol)
 *
 * @param useSecureWebSockets
 **/
spiInstance.SetSecureWebSockets(
  window.location.protocol === "https:"
    ? true
    : false
);

/**
 * Call this method to set the client library test mode.
 * Set it to true only while you are developing the integration with a physical test terminal. 
 * If you are using Gecko Bank then it should be set to false.
 * It defaults to false. For a real merchant, always leave it set to false.
 *
 * @param testMode
 **/
spiInstance.SetTestMode(false);

// A function which is for shown some logs
function infoLogger(eventName, data) {
  spiInstance._log.info(`${eventName} -> `, data);
}

// snackbar log listener
function snackbarLog(content, isTimeout, period) {
  var snackbarDOM = document.getElementById("snackbar");
  snackbarDOM.innerHTML = content;

  if (isTimeout)
    setTimeout(() => {
      snackbarDOM.innerHTML = "";
    }, period);
}

// A function which generates random reference ids for transaction usage
function autoIdGenerator(type) {
  return new Date().toISOString() + "-" + type;
}

/**
 * Event: StatusChanged
 * This method will be called when the terminal connection status changes.
 *
 **/
document.addEventListener("StatusChanged", (e) => {
  infoLogger("StatusChanged", e);
  const pairBtnNode = document.getElementById("pair");
  const btnNodes = document.getElementsByClassName("btn");

  if (e?.detail === "PairedConnected") {
    pairBtnNode.style.pointerEvents = "none";
    for (let i = 0; i < btnNodes.length; i++) {
      btnNodes[i].style.pointerEvents = "auto";
    }
  } else {
    pairBtnNode.style.pointerEvents = "auto";
    for (let i = 0; i < btnNodes.length; i++) {
      btnNodes[i].style.pointerEvents = "none";
    }
  }
});

/**
 * Event: SecretsChanged
 * For saving secrets after terminal paired (in order to keep current terminal instance activated)
 **/
document.addEventListener("SecretsChanged", (e) => {
  if (e?.detail) {
    infoLogger("SecretsChanged", e);
    window.localStorage.setItem("secrets", JSON.stringify(e.detail));
  }
});

/**
 * Event: PairingFlowStateChanged
 * To get latest updates on the pairing process
 **/
document.addEventListener("PairingFlowStateChanged", (e) => {
  infoLogger("PairingFlowStateChanged", e);
  snackbarLog(
    e?.detail?.Message ===
      "Confirm that the following Code is showing on the Terminal"
      ? `${e?.detail?.Message}: ${e?.detail?.ConfirmationCode}`
      : e?.detail?.Message
  );

  if (
    e?.detail?.Message === "Pairing Successful!" ||
    e?.detail?.Message === "Pairing Failed"
  )
    setTimeout(() => snackbarLog(""), 3000);

  // if paring flow state of Successful and Finished turns to true, then we call terminal back to Idle status
  if (e?.detail?.Successful && e?.detail?.Finished)
    spiInstance.AckFlowEndedAndBackToIdle();
});

/**
 * Event: TxFlowStateChanged
 * To get latest updates on the transaction flow
 **/
document.addEventListener("TxFlowStateChanged", (e) => {
  infoLogger("TxFlowStateChanged", e);

  if (e?.detail?.Finished) {
    snackbarLog(
      `${e?.detail?.Type} of $${parseFloat(
        e?.detail?.Type === "CashoutOnly"
          ? (e?.detail?.Response?.Data?.cash_amount || 0) / 100
          : (e?.detail?.Response?.Data?.bank_noncash_amount || 0) / 100
      )} has been ${
        e?.detail?.Success === "Success" ? "approved ✅" : "declined ❌"
      }.`,
      true,
      3000
    );
  }
});

/**
 * Event: BatteryLevelChanged
 * To get latest updates for terminal battery level
 **/
document.addEventListener("BatteryLevelChanged", (e) => {
  infoLogger("BatteryLevelChanged", e);
});

/**
 * Event: TerminalConfigurationResponse
 * To get latest terminal confirmation object data
 **/
spiInstance.TerminalConfigurationResponse = (e) => {
  infoLogger("TerminalConfigurationResponse", e);

  spiInstance.GetTerminalStatus();
};

/**
 * Event: TerminalStatusResponse
 * To get latest terminal status object data
 **/
spiInstance.TerminalStatusResponse = (e) => {
  infoLogger("TerminalStatusResponse", e);
};

/**
 * Start the terminal instance, including:
 ** Connect terminal
 ** Reconnect terminal terminal
 ** Validate posId and eftpos address
 *
 **/
spiInstance.Start();

// pair a terminal
function pair() {
  spiInstance.Pair();

  infoLogger("pairing ..");
}

// unpair a terminal
function unpair() {
  if (!spiInstance) return;

  spiInstance.AckFlowEndedAndBackToIdle(); // Ensure terminal is always on Idle status before unpair a terminal

  spiInstance.Unpair();

  infoLogger("unpaired ..", spiInstance);
  snackbarLog("Terminal unpaired 🚪", true, 3000);

  if (spiInstance._currentStatus === "Unpaired")
    window.localStorage.removeItem("secrets");
}

// transaction: purchase
function purchase() {
  spiInstance.AckFlowEndedAndBackToIdle(); // Ensure terminal is always on Idle status before make transaction
  spiInstance.InitiatePurchaseTxV2(autoIdGenerator("purchase"), 500);
  snackbarLog("Purchase in progress ..");
  // after purchase type transaction completed, which requires to update the transaction message.
  spiInstance.TransactionUpdateMessage = (e) => {
    infoLogger("TransactionUpdateMessage", e);
  };
}

// transaction: refund
function refund() {
  spiInstance.AckFlowEndedAndBackToIdle(); // Ensure terminal is always on Idle status before make transaction
  snackbarLog("Refund in progress ..");
  spiInstance.InitiateRefundTx(autoIdGenerator("refund"), 1000, false);
}

// transaction: cashout
function cashout() {
  spiInstance.AckFlowEndedAndBackToIdle(); // Ensure terminal is always on Idle status before make transaction
  snackbarLog("Cashout in progress ..");
  spiInstance.InitiateCashoutOnlyTx(autoIdGenerator("cashout"), 2000);
}
