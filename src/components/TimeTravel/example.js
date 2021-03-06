import React from 'react';
import faker from 'faker';
import moment from 'moment';
import { compact, times } from 'lodash';

import Text from '../Text';
import TimeTravel from '.';
import { Example, Info } from '../../utils/example';

function generateDeployments({ startTime, endTime }, count) {
  return times(count, () => ({
    Stamp: moment.unix(faker.random.number({ min: startTime, max: endTime })),
    Data: compact([
      `Commit: ${faker.lorem.word()}`,
      Math.random() < 0.5 && faker.lorem.slug(),
      Math.random() < 0.5 && faker.lorem.slug(),
      Math.random() < 0.5 && faker.lorem.slug(),
    ]).join(', '),
  }));
}

export default class TimeTravelExample extends React.Component {
  constructor() {
    super();

    this.state = {
      timestamp1: moment().format(),
      timestamp2: moment().format(),
      timestamp3: moment().format(),
      showingLive3: true,
      rangeMs3: 3600000,
      visibleStartAt: null,
      visibleEndAt: null,
      deployments: generateDeployments({
        startTime: moment().subtract(1, 'month').unix(),
        endTime: moment().unix(),
      }, 500),
    };
  }

  handleChangeTimestamp1 = (timestamp1) => {
    this.setState({ timestamp1 });
  };

  handleChangeTimestamp2 = (timestamp2) => {
    this.setState({ timestamp2 });
  };

  handleChangeTimestamp3 = (timestamp3) => {
    this.setState({ timestamp3 });
  };

  handleChangeLiveMode3 = (showingLive3) => {
    this.setState({ showingLive3 });
  };

  handleChangeRange3 = (rangeMs3) => {
    this.setState({ rangeMs3 });
  };

  handleUpdateVisibleRange = ({ startAt, endAt }) => {
    this.setState({
      visibleStartAt: startAt,
      visibleEndAt: endAt,
    });
  }

  render() {
    return (
      <div>
        <Example>
          <Info>Simple timestamp selector</Info>
          <TimeTravel
            timestamp={this.state.timestamp1}
            onChangeTimestamp={this.handleChangeTimestamp1}
            onUpdateVisibleRange={this.handleUpdateVisibleRange}
          />
        </Example>
        <Example>
          <Info>With deployments</Info>
          <TimeTravel
            timestamp={this.state.timestamp2}
            onChangeTimestamp={this.handleChangeTimestamp2}
            onUpdateVisibleRange={this.handleUpdateVisibleRange}
            deployments={this.state.deployments}
          />
        </Example>
        <Example>
          <Info>Range selector with live mode support</Info>
          <TimeTravel
            timestamp={this.state.timestamp3}
            onChangeTimestamp={this.handleChangeTimestamp3}
            hasLiveMode
            showingLive={this.state.showingLive3}
            onChangeLiveMode={this.handleChangeLiveMode3}
            hasRangeSelector
            rangeMs={this.state.rangeMs3}
            onChangeRange={this.handleChangeRange3}
            onUpdateVisibleRange={this.handleUpdateVisibleRange}
          />
        </Example>
        <hr />
        <Text small>
          Visible range: {this.state.visibleStartAt} - {this.state.visibleEndAt}
        </Text>
      </div>
    );
  }
}
