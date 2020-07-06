// Personal token constants
// Note that this address is also duplicated in profile_tokens.js
const factoryAddress = '0x80D50970599E33d0D5D436A649C25b729666A015';

let contributorBounties = {};
let pTokens = {};
let bounties = {};
let authProfile = document.contxt.profile_id;
let skills = document.skills;

Vue.mixin({
  methods: {
    fetchBounties: function(type) {
      let vm = this;
      let apiUrlbounties = `/funder_dashboard/${type}/`;
      let getbounties = fetchData (apiUrlbounties, 'GET');

      $.when(getbounties).then(function(response) {
        vm.$set(vm.bounties, type, response);
        vm.isLoading[type] = false;
      }).catch(function() {
        vm.isLoading[type] = false;
        vm.error[type] = 'Error fetching bounties. Please contact founders@gitcoin.co';
      });
    },
    fetchTokens: function(type) {
      let vm = this;
      let api = `/ptokens/redemptions/${type}/`;
      let getTokens = fetchData (api, 'GET');

      $.when(getTokens).then(function(response) {
        vm.$set(vm.pTokens, type, response);
        vm.isLoading[type] = false;
      }).catch(function() {
        vm.isLoading[type] = false;
        vm.error[type] = 'Error fetching tokens. Please contact founders@gitcoin.co';
      });
    },
    fetchApplicants: function(id, key, type) {
      let vm = this;
      let apiUrlApplicants = `/funder_dashboard/bounties/${id}/`;

      if (vm.bounties[type][key].contributors) {
        return;
      }
      let getApplicants = fetchData (apiUrlApplicants, 'GET');

      $.when(getApplicants).then(function(response) {
        vm.$set(vm.bounties[type][key], 'contributors', response.profiles);
        vm.isLoading[`${type}Contrib`] = false;
      }).catch(function() {
        vm.isLoading[`${type}Contrib`] = false;
      });
    },
    fetchContributorBounties: function(type) {
      let vm = this;
      let apiUrlbounties = `/contributor_dashboard/${type}/`;
      let getbounties = fetchData (apiUrlbounties, 'GET');

      $.when(getbounties).then(function(response) {
        vm.$set(vm.contributorBounties, type, response);
        vm.isLoading[type] = false;
      }).catch(function() {
        vm.isLoading[type] = false;
        vm.error[type] = 'Error fetching bounties. Please contact founders@gitcoin.co';
      });
    },
    fetchMatchingBounties: function() {
      let vm = this;

      vm.network = document.web3network;
      const apiUrlbounties = `/api/v0.1/bounties/slim/?network=${vm.network}&idx_status=open&applicants=ALL&keywords=${vm.skills}&order_by=-web3_created&offset=0&limit=10`;

      if (vm.matchingBounties.length) {
        return;
      }

      const getbounties = fetchData (apiUrlbounties, 'GET');

      $.when(getbounties).then(function(response) {
        vm.matchingBounties = response;
        vm.isLoading.matchingBounties = false;
      }).catch(function() {
        vm.isLoading.matchingBounties = false;
      });


    },
    isExpanded(key, type) {
      return this.expandedGroup[type].indexOf(key) !== -1;
    },
    toggleCollapse(key, type) {
      if (this.isExpanded(key, type)) {
        this.expandedGroup[type].splice(this.expandedGroup[type].indexOf(key), 1);
      } else {
        this.expandedGroup[type].push(key);
      }
    },
    startWork(key, bountyPk, profileId) {
      let vm = this;
      let url = `/actions/bounty/${bountyPk}/interest/${profileId}/interested/`;
      let postStartpWork = fetchData (url, 'POST');

      vm.disabledBtn = key;

      $.when(postStartpWork).then(response => {
        vm.contributors.splice(key, 1);
        vm.disabledBtn = '';
        _alert({ message: gettext('Contributor removed from bounty.') }, 'success');
      }, error => {
        vm.disabledBtn = '';
        let msg = error.responseJSON.error || 'got an error. please try again, or contact support@gitcoin.co';

        console.log(error.responseJSON.error);
        _alert({ message: gettext(msg) }, 'error');
      });
    },
    stopWork(key, bountyPk, profileId, obj, section) {
      let vm = this;
      // let url = `/actions/bounty/${bountyPk}/interest/${profileId}/uninterested/`;
      let url = `/actions/bounty/${bountyPk}/interest/remove/`;

      vm.disabledBtn = key;
      if (window.confirm('Do you want to stop working on this bounty?')) {
        let postStartpWork = fetchData (url, 'POST');

        $.when(postStartpWork).then(response => {
          vm[obj][section].splice(key, 1);
          vm.disabledBtn = '';
          _alert({ message: gettext('Contributor removed from bounty.') }, 'success');
        }, error => {
          vm.disabledBtn = '';
          let msg = error.responseJSON.error || 'got an error. please try again, or contact support@gitcoin.co';

          _alert({ message: gettext(msg) }, 'error');
        });
      } else {
        vm.disabledBtn = '';
      }
    },
    removeWorker(key, bountyPk, profileId, obj, section) {
      let vm = this;
      let url = `/actions/bounty/${bountyPk}/interest/${profileId}/uninterested/`;

      vm.disabledBtn = key;
      if (window.confirm('Do you want to stop contributor work on this bounty?')) {
        let postStartpWork = fetchData (url, 'POST');

        $.when(postStartpWork).then(response => {
          vm[obj][section].splice(key, 1);
          vm.disabledBtn = '';
          _alert({ message: gettext('Contributor removed from bounty.') }, 'success');
        }, error => {
          vm.disabledBtn = '';
          let msg = error.responseJSON.error || 'got an error. please try again, or contact support@gitcoin.co';

          _alert({ message: gettext(msg) }, 'error');
        });
      } else {
        vm.disabledBtn = '';
      }
    },
    checkData(persona) {
      let vm = this;

      if (!Object.keys(vm.bounties).length && persona === 'funder') {
        vm.fetchBounties('open');
        vm.fetchBounties('started');
        vm.fetchBounties('submitted');
        vm.fetchBounties('expired');
      }

      if (!Object.keys(vm.contributorBounties).length && persona === 'contributor') {
        vm.fetchContributorBounties('work_in_progress');
        vm.fetchContributorBounties('work_submitted');
        vm.fetchContributorBounties('interested');
      }
      if (!Object.keys(vm.pTokens).length && persona === 'personal-tokens') {
        vm.fetchTokens('open');
        vm.fetchTokens('accepted');
        vm.fetchTokens('completed');
        vm.fetchTokens('denied');
      }
    },
    tabOnLoad(init) {
      let vm = this;
      const params = new URLSearchParams(window.location.search);

      if (document.contxt.persona_is_hunter) {
        vm.checkData('contributor');
      } else {
        vm.checkData('funder');
      }

      if (init && params.get('tab') === 'ptoken') {
        vm.checkData('personal-tokens');
        $('#ptokens-tab').tab('show');
      } else if (document.contxt.persona_is_hunter) {
        $('#contributor-tab').tab('show');
      } else {
        $('#funder-tab').tab('show');
      }

    },
    redirect(url) {
      document.location.href = url;
    },
    async createPToken() {
      try {
        // TODO: Show loading while deploying
        let price = parseFloat(this.newPToken.price);
        let supply = parseFloat(this.newPToken.supply);
        let stopFlow;

        if (this.newPToken.name === '') {
          this.$set(this.pToken, 'is_invalid_name', true);
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_name', true);
        }

        if (this.newPToken.symbol === '') {
          this.$set(this.pToken, 'is_invalid_symbol', true);
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_symbol', true);
        }

        if (isNaN(price) || price <= 0) {
          this.$set(this.pToken, 'is_invalid_price', true);
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_price', false);
          this.newPToken.is_invalid_price = false;
        }

        if (isNaN(supply) || supply <= 0) {
          this.$set(this.pToken, 'is_invalid_supply', true);
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_supply', false);
        }

        if (!this.newPToken.tos) {
          this.$set(this.pToken, 'is_invalid_tos', true);
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_tos', false);
        }

        if (stopFlow)
          return;

        this.newPToken.deploying = true;
        await this.deployAndSaveToken();
        this.newPToken.deploying = false;
      } catch (error) {
        console.log(error);
      }
    },
    async editPToken() {
      try {
        // TODO: Show loading while deploying
        let price = parseFloat(this.pToken.price);
        let supply = parseFloat(this.pToken.supply);
        let supply_locked = document.ptoken.supply - document.ptoken.available;
        let stopFlow;

        if (isNaN(price) || price <= 0) {
          this.$set(this.pToken, 'is_invalid_price', true);
          this.supplyInvalidMsg = 'Please provide a supply amount';
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_price', false);
        }

        if (isNaN(supply) || supply <= 0) {
          this.$set(this.pToken, 'is_invalid_supply', true);
          !stopFlow && (stopFlow = true);
        } else if (supply < supply_locked) {
          this.$set(this.pToken, 'is_invalid_supply', true);
          this.supplyInvalidMsg = `The supply will be greater than ${supply_locked} DAI`;
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_supply', false);
        }

        if (!this.pToken.tos) {
          this.$set(this.pToken, 'is_invalid_tos', true);
          !stopFlow && (stopFlow = true);
        } else {
          this.$set(this.pToken, 'is_invalid_tos', false);
        }

        if (stopFlow)
          return;

        this.pToken.deploying = true;

        if (price !== document.ptoken.price) {
          change_price(this.pToken.id, price);
          document.ptoken.price = price;
        }

        if (supply !== document.ptoken.supply) {
          if (supply > document.ptoken.supply) {
            console.log('Mint more pTokens');
            mint_tokens(this.pToken.id, supply);
            document.ptoken.supply = supply;
          } else {
            console.log('Reduce pTokens supply');
            mint_tokens(this.pToken.id, supply);
            document.ptoken.supply = supply;
          }
        }
        $('#closeEdit').click();
        this.pToken.deploying = false;
      } catch (error) {
        console.log(error);
      }
    },
    async deployAndSaveToken() {
      const vm = this;

      if (!web3) {
        _alert('Please connect a wallet', 'error');
      }
      [user] = await web3.eth.getAccounts();

      // We currently have DAI addresses hardcoded, so right now pTokens only support
      // being priced in DAI
      let purchaseTokenAddress;

      if (document.web3network === 'rinkeby') {
        purchaseTokenAddress = '0x6A9865aDE2B6207dAAC49f8bCba9705dEB0B0e6D';
      } else if (document.web3network === 'mainnet') {
        purchaseTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
      } else {
        _alert('Unsupported network', 'error');
        return;
      }
      const factory = await new web3.eth.Contract(document.contxt.ptoken_factory_abi, factoryAddress);
      const newPToken = this.newPToken;

      // Deploy on-chain
      indicateMetamaskPopup();
      factory.methods.createPToken(
        newPToken.name,
        newPToken.symbol,
        web3.utils.toWei(String(newPToken.price)),
        web3.utils.toWei(String(newPToken.supply)),
        purchaseTokenAddress
      ).send({
        from: user
      }).on('transactionHash', function(transactionHash) {
        // Save to database
        create_ptoken(
          newPToken.name,
          newPToken.symbol,
          '0x0',
          newPToken.price,
          newPToken.supply,
          user,
          transactionHash,
          (new Date()).toISOString()
        );
        vm.user_has_token = true;
        console.log('Token Created!');
      }).on('error', function(err) {
        this.handleError(err);
      });
    },

    handleError(err) {
      console.error(err); // eslint-disable-line no-console
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
  }
});


if (document.getElementById('gc-board')) {
  var app = new Vue({
    delimiters: [ '[[', ']]' ],
    el: '#gc-board',
    data: {
      network: document.web3network,
      user_has_token: document.user_has_token,
      bounties: bounties,
      openBounties: [],
      submittedBounties: [],
      expiredBounties: [],
      contributors: [],
      contributorBounties: contributorBounties,
      pTokens: pTokens,
      expandedGroup: {'submitted': [], 'open': [], 'started': [], 'bountiesMatch': []},
      disabledBtn: false,
      authProfile: authProfile,
      skills: skills,
      matchingBounties: [],
      pToken: Object.assign({}, document.ptoken),
      supplyInvalidMsg: 'Please provide a supply amount',
      newPToken: {
        name: '',
        symbol: '',
        price: '',
        supply: '',
        deploying: false
      },
      isLoading: {
        'open': true,
        'openContrib': true,
        'started': true,
        'startedContrib': true,
        'submitted': true,
        'submittedContrib': true,
        'expired': true,
        'work_in_progress': true,
        'interested': true,
        'work_submitted': true,
        'matchingBounties': true
      },
      error: {
        'open': '',
        'openContrib': '',
        'started': '',
        'startedContrib': '',
        'submitted': '',
        'submittedContrib': '',
        'expired': '',
        'work_in_progress': '',
        'interested': '',
        'work_submitted': ''
      }
    },
    mounted() {
      this.tabOnLoad(true);
    }
  });
}

Vue.filter('pluralize', (word, amount, singular, plural) => {
  plural = plural || 's';
  singular = singular || '';
  return amount !== 1 ? `${word + plural}` : `${word + singular}`;
});

Vue.filter('truncate', (account, num) => {
  num = !num ? num = 4 : num;
  return account.substr(0, num + 2) + '\u2026' + account.substr(-num);
});

Vue.filter('moment', (date) => {
  moment.locale('en');
  return moment.utc(date).fromNow();
});

Vue.filter('humanizeEth', (number) => {
  return parseInt(number, 10) / Math.pow(10, 18);
});
