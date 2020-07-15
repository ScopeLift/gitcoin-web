// Personal token constants
// Note that this address is also duplicated in board.js
const factoryAddress = document.contxt.ptoken_factory_address;
const purchaseTokenName = 'DAI';

let BN;

$(document).on('click', '#redeemPTokens', (event) => {
  $('#buy_ptoken_modal').bootstrapModal('hide');
  $('#redeemTokenModal').bootstrapModal('show');
});

$(document).on('click', '#submit_buy_token', (event) => {
  event.preventDefault();
  const form = $('#ptokenBuyForm')[0];

  if (form.checkValidity() === false) {
    event.stopPropagation();
    const amount = parseFloat($('#ptokenAmount').val());

    if (isNaN(amount) || amount < 0) {
      $('#ptokenAmount').addClass('is-invalid');
      $('#ptokenAmount ~ .invalid-feedback').show();
    } else {
      $('#ptokenAmount').removeClass('is-invalid');
      $('#ptokenAmount ~ .invalid-feedback').hide();
    }

    if (!$('#ptokenTerms').is(':checked')) {
      $('#ptokenTerms').addClass('is-invalid');
      $('#ptokenTerms ~ .invalid-feedback').show();
    } else {
      $('#ptokenTerms').removeClass('is-invalid');
      $('#ptokenTerms ~ .invalid-feedback').hide();
    }
    return;
  }

  $('#ptokenAmount').removeClass('is-invalid');
  $('#ptokenAmount ~ .invalid-feedback').hide();
  $('#ptokenTerms').removeClass('is-invalid');
  $('#ptokenTerms ~ .invalid-feedback').hide();

  buyPToken($('#ptokenAmount').val());
});

$(document).on('input', '#ptokenRedeemAmount', (event) => {
  event.preventDefault();
  const amount = $(event.target).val();

  $('#ptokenRedeemCost').text(`${document.current_ptoken_value * parseFloat(amount) || 0} ${purchaseTokenName}`);
  $('#redeem-amount').text(parseFloat(amount));
});

$(document).on('input', '#ptokenAmount', (event) => {
  event.preventDefault();
  const amount = $(event.target).val();

  $('#ptokenCost').text(`${document.current_ptoken_value * parseFloat(amount) || 0} ${purchaseTokenName}`);
  $('#buy-amount').text(amount);
});

$(document).on('click', '#submit_redeem_token', (event) => {
  event.preventDefault();
  const form = $('#ptokenRedeemForm')[0];
  const amountField = $(form.ptokenRedeemAmount);
  const tos = $(form.ptokenRedeemTerms);
  const redeem_amount = parseFloat(amountField.val());
  const redeem_description = $('#ptokenRedeemDescription').val()

  if (!tos.prop('checked')) {
    event.stopPropagation();
    _alert('You must agree before submitting', 'error', 2000);
    tos.addClass('is-invalid');
    return;
  }
  tos.removeClass('is-invalid');

  if (isNaN(redeem_amount)) {
    _alert(`Provide a valid amount no greater than ${document.current_hodling} ${document.current_ptoken_symbol}`, 'error', 2000);
    amountField.addClass('is-invalid');
    return;
  } else if (document.current_hodling === 0) {
    _alert(`You don't have ${document.current_ptoken_symbol} tokens`, 'error', 2000);
    amountField.addClass('is-invalid');
    return;
  } else if (redeem_amount > document.current_hodling) {
    _alert(`You can't redeem more than ${document.current_hodling}  ${document.current_ptoken_symbol}`, 'error', 2000);
    amountField.addClass('is-invalid');
    return;
  }
  amountField.removeClass('is-invalid');

  requestPtokenRedemption(redeem_amount, redeem_description);
});

function getTokenByName(name) {
  if (name === 'ETH') {
    return {
      addr: ETH_ADDRESS,
      name: 'ETH',
      decimals: 18,
      priority: 1
    };
  }
  var network = document.web3network;

  return tokens(network).filter(token => token.name === name)[0];
}

async function buyPToken(tokenAmount) {
  await needWalletConnection();
  BN = web3.utils.BN;

  [user] = await web3.eth.getAccounts();
  const pToken = await new web3.eth.Contract(
    document.contxt.ptoken_abi,
    document.current_ptoken_address
  );
  const network = document.web3network;
  const tokenDetails = getTokenByName('DAI');
  const tokenContract = new web3.eth.Contract(token_abi, tokenDetails.addr);
  // To properly handle decimal values, we first convert to Wei and then to a BN instance
  const token_value = new BN(web3.utils.toWei(String(document.current_ptoken_value)), 10);
  const amount = new BN(web3.utils.toWei(tokenAmount, 'ether'));
  // true value = token value * number of requested tokens
  // We then need to convert from Wei to "undo" the above conversion of token_value to Wei
  const true_value = new BN(web3.utils.fromWei(amount.mul(token_value)), 10);
  const allowance = new BN(await getAllowance(document.current_ptoken_address, tokenDetails.addr), 10);

  const waitingState = (state) => {
    indicateMetamaskPopup(!state);
    $('#submit_buy_token').prop('disabled', state);
    $('#close_buy_token').prop('disabled', state);
  };

  const purchasePToken = () => {
    waitingState(true);
    pToken.methods
      .purchase(amount.toString())
      .send({ from: user })
      .on('transactionHash', function(transactionHash) {

        purchase_ptoken(
          document.current_ptoken_id,
          tokenAmount,
          user,
          (new Date()).toISOString(),
          transactionHash,
          network,
          tokenDetails
        );

        _alert('Saving tx. Please do not leave this page.', 'success', 5000);

        callFunctionWhenTransactionMined(transactionHash, () => {
          waitingState(false);
          $('#buyTokenModal').bootstrapModal('hide');
          $('#buy_ptoken_modal').bootstrapModal('show');
          $('#buy-amount').text(tokenAmount);
          $('#buy-tx').prop('href', `https://etherscan.io/tx/${transactionHash}`);
        });
      }).on('error', (error, receipt) => {
        waitingState(false);
        console.log(error);
      });
  };


  // Check user token balance against token value
  console.log(`== user allowance balance: ${allowance}`);
  const userTokenBalance = await tokenContract.methods.balanceOf(user).call({ from: user });

  // Balance is too small, exit checkout flow
  console.log(`== user token balance: ${userTokenBalance}`);
  if (new BN(userTokenBalance, 10).lt(true_value)) {
    _alert(`Insufficient ${tokenDetails.name} balance to complete checkout`, 'error');
    return;
  }

  indicateMetamaskPopup();
  if (allowance.lt(true_value)) {
    tokenContract.methods.approve(document.current_ptoken_address, true_value.toString()).send({from: user}).on('transactionHash', function(txnHash) {
      callFunctionWhenTransactionMined(txnHash, () => {
        indicateMetamaskPopup(true);
        purchasePToken();
      });
    }).on('error', (error, receipt) => {
      indicateMetamaskPopup(true);
      console.log(error);
    });
  } else {
    purchasePToken();
  }
}

async function requestPtokenRedemption(tokenAmount, redemptionDescription) {
  try {
    const network = checkNetwork();
    request_redemption(document.current_ptoken_id, tokenAmount, redemptionDescription, network)
  } catch(err) {
    handleError(err);
  }
}

function checkNetwork() {
  const supportedNetworks = ['rinkeby', 'mainnet'];
  if (!supportedNetworks.includes(document.web3network)) {
    _alert('Unsupported network', 'error');
    throw new Error('Please connect a wallet');
  }
  return document.web3network;
}

// tokenAmount input should be in human-readable form, e.g. "5"
async function completePtokenRedemption(tokenAmount, redemptionId) {
  try {
    const network = checkNetwork();
    const amount = web3.utils.toWei(String(tokenAmount));
    const [ user ] = await web3.eth.getAccounts();

    indicateMetamaskPopup();
    const pToken = await new web3.eth.Contract(
      document.contxt.ptoken_abi,
      document.current_ptoken_address
    );

    pToken.methods.redeem(amount).send({ from: user })
      .on('transactionHash', function(transactionHash) {
        complete_redemption(
          redemptionId,
          transactionHash,
          "pending",
          network,
          new Date().toISOString()
        );
      }).on('error', (error, receipt) => {
        console.log(error);
        handleError(error);
      });
  } catch(err) {
    handleError(err);
  }
}

function handleError(err) {
  console.error(err);
  let message = 'There was an error';

  if (err.message)
    message = err.message;
  else if (err.msg)
    message = err.msg;
  else if (typeof err === 'string')
    message = err;

  _alert(message, 'error');
  indicateMetamaskPopup(true);
}