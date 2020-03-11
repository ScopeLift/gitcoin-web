var appBounty;
let bounty = [];
let url = location.href;

document.result = bounty;

Vue.mixin({
  methods: {
    fetchBounty: function() {
      let vm = this;
      let apiUrlBounty = `/actions/api/v0.1/bounty?github_url=${document.issueURL}`;
      const getBounty = fetchData(apiUrlBounty, 'GET');

      $.when(getBounty).then(function(response) {
        vm.bounty = response[0];
        vm.isOwner = vm.checkOwner(response[0].bounty_owner_github_username);
        document.result = response[0];
        vm.staffOptions();
      }).catch(function(error) {
        _alert('Error fetching bounties. Please contact founders@gitcoin.co', 'error');
      });
    },
    checkOwner: function(handle) {
      let vm = this;

      if (vm.contxt.github_handle) {
        return caseInsensitiveCompare(document.contxt['github_handle'], handle);
      }
      return false;

    },
    checkInterest: function() {
      let vm = this;

      if (!vm.contxt.github_handle) {
        return false;
      }
      return !!(vm.bounty.interested || []).find(interest => caseInsensitiveCompare(interest.profile.handle, vm.contxt.github_handle));

    },
    checkApproved: function() {
      let vm = this;

      if (!vm.contxt.github_handle) {
        return false;
      }
      // pending=false
      let result = vm.bounty.interested.filter(interest => caseInsensitiveCompare(interest.profile.handle, vm.contxt.github_handle));

      return result ? !result.pending : false;

    },
    checkFulfilled: function() {
      let vm = this;

      if (!vm.contxt.github_handle) {
        return false;
      }
      return !!(vm.bounty.fulfillments || []).find(fulfiller => caseInsensitiveCompare(fulfiller.fulfiller_github_username, vm.contxt.github_handle));
    },
    syncGhIssue: function() {
      let vm = this;
      let apiUrlIssueSync = `/sync/get_issue_details?url=${encodeURIComponent(vm.bounty.github_url)}&token=${currentProfile.githubToken}`;
      const getIssueSync = fetchData(apiUrlIssueSync, 'GET');

      $.when(getIssueSync).then(function(response) {
        vm.updateGhIssue(response);
      });
    },
    updateGhIssue: function(response) {
      let vm = this;
      const payload = JSON.stringify({
        issue_description: response.description,
        title: response.title
      });
      let apiUrlUpdateIssue = `/bounty/change/${vm.bounty.pk}`;
      const postUpdateIssue = fetchData(apiUrlUpdateIssue, 'POST', payload);

      $.when(postUpdateIssue).then(function(response) {
        vm.bounty.issue_description = response.description;
        vm.bounty.title = response.title;
        _alert({ message: response.msg }, 'success');
      }).catch(function(response) {
        _alert({ message: response.responseJSON.error }, 'error');
      });
    },
    copyTextToClipboard: function(text) {
      if (!navigator.clipboard) {
        _alert('Could not copy text to clipboard', 'error', 5000);
      } else {
        navigator.clipboard.writeText(text).then(function() {
          _alert('Text copied to clipboard', 'success', 5000);
        }, function(err) {
          _alert('Could not copy text to clipboard', 'error', 5000);
        });
      }
    },
    fulfillmentComplete: function(fulfillment_id, amount, closeBounty, bounty_owner_address) {

      let vm = this;
      const owner_address = vm.bounty.bounty_owner_address ?
        vm.bounty.bounty_owner_address :
        bounty_owner_address;

      const token_name = vm.bounty.token_name;
      const decimals = tokenNameToDetails('mainnet', token_name).decimals;

      const payload = {
        amount: amount * 10 ** decimals,
        token_name: token_name,
        close_bounty: closeBounty,
        bounty_owner_address: owner_address
      };

      const apiUrlBounty = `/api/v1/bounty/payout/${fulfillment_id}`;

      fetchData(apiUrlBounty, 'POST', payload).then(response => {
        if (200 <= response.status && response.status <= 204) {
          console.log('success', response);
        } else {
          _alert('Unable to make payout bounty. Please try again later', 'error');
          console.error(`error: bounty payment failed with status: ${response.status} and message: ${response.message}`);
        }
      });
    },
    show_extend_deadline_modal: function() {
      show_extend_deadline_modal();
    },
    show_interest_modal: function() {
      show_interest_modal();
    },
    staffOptions: function() {
      let vm = this;

      if (!vm.bounty.pk) {
        return;
      }

      if (vm.contxt.is_staff) {
        vm.quickLinks.push({
          label: 'View in Admin',
          href: `/_administrationdashboard/bounty/${vm.bounty.pk}/change/`,
          title: 'View in Admin Tool'
        }, {
          label: 'Hide Bounty',
          href: `${vm.bounty.url}?admin_override_and_hide=1`,
          title: 'Hides Bounty from Active Bounties'
        }, {
          label: 'Toggle Remarket Ready',
          href: `${vm.bounty.url}?admin_toggle_as_remarket_ready=1`,
          title: 'Sets Remarket Ready if not already remarket ready.  Unsets it if already remarket ready.'
        }, {
          label: 'Suspend Auto Approval',
          href: `${vm.bounty.url}?suspend_auto_approval=1`,
          title: 'Suspend *Auto Approval* of Bounty Hunters Who Have Applied for This Bounty'
        });

        if (vm.bounty.needs_review) {
          vm.quickLinks.push({
            label: 'Mark as Reviewed',
            href: `${vm.bounty.url}?mark_reviewed=1`,
            title: 'Suspend *Auto Approval* of Bounty Hunters Who Have Applied for This Bounty'
          });
        }
      }
    }
  },
  computed: {
    sortedActivity: function() {
      return this.bounty.activities.sort((a, b) => new Date(b.created) - new Date(a.created));
    }
  }
});


if (document.getElementById('gc-bounty-detail')) {
  appBounty = new Vue({
    delimiters: [ '[[', ']]' ],
    el: '#gc-bounty-detail',
    data() {
      return {
        bounty: bounty,
        url: url,
        cb_address: cb_address,
        isOwner: false,
        is_bounties_network: is_bounties_network,
        inputAmount: 0,
        inputBountyOwnerAddress: bounty.bounty_owner_address,
        contxt: document.contxt,
        quickLinks: []
      };
    },
    mounted() {
      this.fetchBounty();
    }
  });
}


var show_extend_deadline_modal = function() {
  let modals = $('#modalExtend');
  let modalBody = $('#modalExtend .modal-content');
  const url = '/modal/extend_issue_deadline?pk=' + document.result['pk'];

  moment.locale('en');
  modals.on('show.bs.modal', function() {
    modalBody.load(url, ()=> {
      const currentExpires = moment.utc(document.result['expires_date']);

      $('#modalExtend input[name="expirationTimeDelta"]').daterangepicker({
        parentEl: '#extend_deadline',
        singleDatePicker: true,
        startDate: moment(currentExpires).add(1, 'month'),
        minDate: moment().add(1, 'day'),
        ranges: {
          '1 week': [ moment(currentExpires).add(7, 'days'), moment(currentExpires).add(7, 'days') ],
          '2 weeks': [ moment(currentExpires).add(14, 'days'), moment(currentExpires).add(14, 'days') ],
          '1 month': [ moment(currentExpires).add(1, 'month'), moment(currentExpires).add(1, 'month') ],
          '3 months': [ moment(currentExpires).add(3, 'month'), moment(currentExpires).add(3, 'month') ],
          '1 year': [ moment(currentExpires).add(1, 'year'), moment(currentExpires).add(1, 'year') ]
        },
        'locale': {
          'customRangeLabel': 'Custom'
        }
      }, function(start, end, label) {
        set_extended_time_html(end);
      });

      set_extended_time_html($('#modalExtend input[name="expirationTimeDelta"]').data('daterangepicker').endDate);

      $('#neverExpires').on('click', () => {
        if ($('#neverExpires').is(':checked')) {
          $('#expirationTimeDelta').attr('disabled', true);
          $('#extended-expiration-date #extended-days').html('Never');
          $('#extended-expiration-date #extended-date').html('-');
        } else {
          $('#expirationTimeDelta').attr('disabled', false);
          set_extended_time_html($('#modalExtend input[name="expirationTimeDelta"]').data('daterangepicker').endDate);
        }
      });

      modals.on('submit', function(event) {
        event.preventDefault();

        var extended_time = $('input[name=updatedExpires]').val();

        extend_expiration(document.result['pk'], {
          deadline: extended_time
        });
        // setTimeout(function() {
        //   window.location.reload();
        // }, 2000);
      });
    });
  });
  modals.bootstrapModal('show');
  $(document, modals).on('hidden.bs.modal', function(e) {
    $('#extend_deadline').remove();
    $('.daterangepicker').remove();
  });
};

var set_extended_time_html = function(extendedDuration) {
  extendedDuration = extendedDuration.set({hour: 0, minute: 0, second: 0, millisecond: 0});
  $('input[name=updatedExpires]').val(extendedDuration.utc().unix());
  $('#extended-expiration-date #extended-date').html(extendedDuration.format('MM-DD-YYYY hh:mm A'));
  $('#extended-expiration-date #extended-days').html(moment.utc(extendedDuration).fromNow());
};

var extend_expiration = function(bounty_pk, data) {
  var request_url = '/actions/bounty/' + bounty_pk + '/extend_expiration/';

  $.post(request_url, data, function(result) {

    if (result.success) {
      _alert({ message: result.msg }, 'success');
      appBounty.bounty.expires_date = moment.unix(data.deadline).utc().format();
      return appBounty.bounty.expires_date;
    }
    return false;
  }).fail(function(result) {
    _alert({ message: gettext('got an error. please try again, or contact support@gitcoin.co') }, 'error');
  });
};

var show_interest_modal = function() {
  var self = this;
  var modals = $('#modalInterest');
  let modalBody = $('#modalInterest .modal-content');
  let modalUrl = `/interest/modal?redirect=${window.location.pathname}&pk=${document.result['pk']}`;

  modals.on('show.bs.modal', function() {
    modalBody.load(modalUrl, ()=> {
      if (document.result['repo_type'] === 'private') {
        document.result.unsigned_nda ? $('.nda-download-link').attr('href', document.result.unsigned_nda.doc) : $('#nda-upload').hide();
      }

      let actionPlanForm = $('#action_plan');
      let issueMessage = $('#issue_message');

      issueMessage.attr('placeholder', gettext('What steps will you take to complete this task? (min 30 chars)'));

      actionPlanForm.on('submit', function(event) {
        event.preventDefault();

        let msg = issueMessage.val().trim();

        if (!msg || msg.length < 30) {
          _alert({message: gettext('Please provide an action plan for this ticket. (min 30 chars)')}, 'error');
          return false;
        }

        const issueNDA = document.result['repo_type'] === 'private' ? $('#issueNDA')[0].files : undefined;

        if (issueNDA && typeof issueNDA[0] !== 'undefined') {

          const formData = new FormData();

          formData.append('docs', issueNDA[0]);
          formData.append('doc_type', 'signed_nda');

          const ndaSend = {
            url: '/api/v0.1/bountydocument',
            method: 'POST',
            data: formData,
            processData: false,
            dataType: 'json',
            contentType: false
          };

          $.ajax(ndaSend).done(function(response) {
            if (response.status == 200) {
              _alert(response.message, 'info');
              add_interest(document.result['pk'], {
                issue_message: msg,
                signed_nda: response.bounty_doc_id,
                discord_username: $('#discord_username').length ? $('#discord_username').val() : null
              }).then(success => {
                if (success) {
                  $(self).attr('href', '/uninterested');
                  $(self).find('span').text(gettext('Stop Work'));
                  $(self).parent().attr('title', '<div class="tooltip-info tooltip-sm">' + gettext('Notify the funder that you will not be working on this project') + '</div>');
                  modals.bootstrapModal('hide');
                }
              }).catch((error) => {
                if (error.responseJSON.error === 'You may only work on max of 3 issues at once.')
                  return;
                throw error;
              });
            } else {
              _alert(response.message, 'error');
            }
          }).fail(function(error) {
            _alert(error, 'error');
          });
        } else {
          add_interest(document.result['pk'], {
            issue_message: msg,
            discord_username: $('#discord_username').length ? $('#discord_username').val() : null
          }).then(success => {
            if (success) {
              // $(self).attr('href', '/uninterested');
              // $(self).find('span').text(gettext('Stop Work'));
              // $(self).parent().attr('title', '<div class="tooltip-info tooltip-sm">' + gettext('Notify the funder that you will not be working on this project') + '</div>');
              appBounty.fetchBounty();
              modals.bootstrapModal('hide');

              if (document.result.event) {
                projectModal(document.result.pk);
              }
            }
          }).catch((error) => {
            if (error.responseJSON.error === 'You may only work on max of 3 issues at once.')
              return;
            throw error;
          });
        }

      });

    });
  });
  modals.bootstrapModal('show');
};