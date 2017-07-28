import React from 'react';
import Reflux from 'reflux';
import jQuery from 'jquery';

import utils from '../utils';
import {t} from '../locale';
import ApiMixin from '../mixins/apiMixin';
import ProjectState from '../mixins/projectState';
import GroupStore from '../stores/groupStore';

import GroupListHeader from '../components/groupListHeader';
import LoadingError from '../components/loadingError';
import LoadingIndicator from '../components/loadingIndicator';
import EmptyView from '../components/emptyView';
import StreamGroup from '../components/stream/group';

const GroupList = React.createClass({
  propTypes: {
    query: React.PropTypes.string.isRequired,
    canSelectGroups: React.PropTypes.bool,
    orgId: React.PropTypes.string.isRequired,
    projectId: React.PropTypes.string.isRequired,
    bulkActions: React.PropTypes.bool.isRequired
  },

  contextTypes: {
    location: React.PropTypes.object
  },

  mixins: [ProjectState, Reflux.listenTo(GroupStore, 'onGroupChange'), ApiMixin],

  getDefaultProps() {
    return {
      canSelectGroups: true
    };
  },

  getInitialState() {
    return {
      loading: true,
      error: false,
      groupIds: []
    };
  },

  componentWillMount() {
    this._streamManager = new utils.StreamManager(GroupStore);

    this.fetchData();
  },

  shouldComponentUpdate(nextProps, nextState) {
    return !utils.valueIsEqual(this.state, nextState, true);
  },

  componentDidUpdate(prevProps) {
    if (
      prevProps.orgId !== this.props.orgId ||
      prevProps.projectId !== this.props.projectId
    ) {
      this.fetchData();
    }
  },

  componentWillUnmount() {
    GroupStore.loadInitialData([]);
  },

  fetchData() {
    GroupStore.loadInitialData([]);

    this.setState({
      loading: true,
      error: false
    });

    this.api.request(this.getGroupListEndpoint(), {
      success: (data, _, jqXHR) => {
        this._streamManager.push(data);

        this.setState({
          error: false,
          loading: false,
          pageLinks: jqXHR.getResponseHeader('Link')
        });
      },
      error: () => {
        this.setState({
          error: true,
          loading: false
        });
      }
    });
  },

  getGroupListEndpoint() {
    let queryParams = this.context.location.query;
    queryParams.limit = 50;
    queryParams.sort = 'new';
    queryParams.query = this.props.query;
    let querystring = jQuery.param(queryParams);

    let props = this.props;
    return '/projects/' + props.orgId + '/' + props.projectId + '/issues/?' + querystring;
  },

  onGroupChange() {
    let groupIds = this._streamManager.getAllItems().map(item => item.id);
    if (!utils.valueIsEqual(groupIds, this.state.groupIds)) {
      this.setState({
        groupIds: groupIds
      });
    }
  },

  render() {
    if (this.state.loading) return <LoadingIndicator />;
    else if (this.state.error) return <LoadingError onRetry={this.fetchData} />;
    else if (this.state.groupIds.length === 0)
      return (
        <EmptyView>
          {`${t("There doesn't seem to be any events fitting the query")}.`}
        </EmptyView>
      );

    let wrapperClass;

    if (!this.props.bulkActions) {
      wrapperClass = 'stream-no-bulk-actions';
    }

    let {orgId, projectId} = this.props;

    return (
      <div className={wrapperClass}>
        <GroupListHeader />
        <ul className="group-list">
          {this.state.groupIds.map(id => {
            return (
              <StreamGroup
                key={id}
                id={id}
                orgId={orgId}
                projectId={projectId}
                canSelect={this.props.canSelectGroups}
              />
            );
          })}
        </ul>
      </div>
    );
  }
});

export default GroupList;
