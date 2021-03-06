import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import ResizeAware from 'react-resize-aware';
import { transparentize } from 'polished';
import { debounce } from 'lodash';
import { drag } from 'd3-drag';
import { event as d3Event, select } from 'd3-selection';
import { Motion } from 'react-motion';

import { strongSpring } from '../../utils/animation';
import { formattedTimestamp, getTimeScale } from '../../utils/timeline';
import { zoomFactor } from '../../utils/zooming';
import theme from '../../theme';

import TimelineDeployments from './_TimelineDeployments';
import TimelinePeriodLabels from './_TimelinePeriodLabels';
import TimelineRange from './_TimelineRange';

const TIMELINE_HEIGHT = '55px';

const TimelineWrapper = styled.div`
  width: 100%;
  height: ${TIMELINE_HEIGHT};

  &:before,
  &:after {
    border: 1px solid ${props => props.theme.colors.white};
    background-color: ${props => props.theme.colors.accent.orange};
    box-sizing: border-box;
    content: '';
    pointer-events: none;
    position: absolute;
    display: block;
    left: 50%;
    border-top: 0;
    border-bottom: 0;
    margin-left: -1px;
    width: 3px;
  }

  &:before {
    top: 0;
    height: ${TIMELINE_HEIGHT};
  }

  &:after {
    top: ${TIMELINE_HEIGHT};
    height: 9px;
    opacity: 0.15;
  }
`;

// From https://stackoverflow.com/a/18294634
const FullyPannableCanvas = styled.svg`
  width: 100%;
  height: 100%;
  cursor: move;
  cursor: grab;
  cursor: -moz-grab;
  cursor: -webkit-grab;

  ${props =>
    props.panning &&
    `
    cursor: grabbing;
    cursor: -moz-grabbing;
    cursor: -webkit-grabbing;
  `};
`;

const TimelineContainer = FullyPannableCanvas.extend`
  background-color: ${props => transparentize(0.15, props.theme.colors.white)};
  box-shadow: inset 0 0 7px ${props => props.theme.colors.gray};
  pointer-events: all;
`;

class Timeline extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      width: 0,
      height: 0,
      isPanning: false,
      hasPanned: false,
    };

    this.delayedHandleResize = debounce(this.handleResize, 200);
    this.delayedUpdateVisibleRange = debounce(this.updateVisibleRange, 200);
  }

  componentDidMount() {
    this.svg = select(this.svgRef);
    this.drag = drag()
      .on('start', this.handlePanStart)
      .on('end', this.handlePanEnd)
      .on('drag', this.handlePan);
    this.svg.call(this.drag);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.rangeMs !== nextProps.rangeMs) {
      this.delayedUpdateVisibleRange();
    }
  }

  handlePanStart = () => {
    this.setState({ isPanning: true });
  }

  handlePanEnd = () => {
    if (this.state.hasPanned) {
      this.props.onRelease();
    }
    this.setState({ isPanning: false, hasPanned: false });
    this.delayedUpdateVisibleRange();
  }

  handlePan = () => {
    const timeScale = getTimeScale(this.props);
    const momentTimestamp = timeScale.invert(-d3Event.dx);
    this.props.onPan(momentTimestamp);
    this.setState({ hasPanned: true });
  }

  handleZoom = (ev) => {
    const { durationMsPerPixel } = this.props;
    this.props.onZoom(durationMsPerPixel / zoomFactor(ev));
    this.delayedUpdateVisibleRange();
    ev.preventDefault();
  }

  handleResize = ({ width, height }) => {
    // Update the timeline dimension information.
    this.setState({ width, height });
    this.delayedUpdateVisibleRange();
    this.props.onResize(width);
  }

  updateVisibleRange = () => {
    const { width } = this.state;
    const timeScale = getTimeScale(this.props);

    // Update the visible part of the timeline.
    this.props.onUpdateVisibleRange({
      startAt: moment(timeScale.invert(-width / 2)).utc().format(),
      endAt: moment(timeScale.invert(width / 2)).utc().format(),
    });
  }

  saveSvgRef = (ref) => {
    this.svgRef = ref;
  }

  renderAxis(transform) {
    const { width, height } = this.state;
    const { focusedTimestamp, rangeMs } = transform;
    const startTimestamp = moment(focusedTimestamp)
      .subtract(rangeMs)
      .format();
    const timeScale = getTimeScale(transform);

    return (
      <g className="axis">
        <rect
          className="tooltip-container"
          transform={`translate(${-width / 2}, 0)`}
          width={width}
          height={height}
          fillOpacity={0}
        />

        <TimelineRange
          color={theme.colors.gray}
          width={width}
          height={height}
          endAt={this.props.earliestTimestamp}
          timeScale={timeScale}
        />
        <TimelineRange
          color={theme.colors.gray}
          width={width}
          height={height}
          startAt={this.props.timestampNow}
          timeScale={timeScale}
        />
        {this.props.inspectingInterval && (
          <TimelineRange
            color={theme.colors.accent.blue}
            width={width}
            height={height}
            startAt={startTimestamp}
            endAt={focusedTimestamp}
            timeScale={timeScale}
          />
      )}renderAxis

        <TimelineDeployments
          width={width}
          height={height}
          timeScale={timeScale}
          deployments={this.props.deployments}
        />

        <g className="ticks" transform="translate(0, 1)">
          {['year', 'month', 'day', 'minute'].map(period => (
            <TimelinePeriodLabels
              key={period}renderAxis
              period={period}
              width={width}
              onClick={this.props.onJump}
              clickableStartAt={this.props.earliestTimestamp}
              clickableEndAt={this.props.timestampNow}
              {...transform}
            />
          ))}
        </g>
      </g>
    );
  }

  render() {
    const { isPanning, width } = this.state;
    const { focusedTimestamp, durationMsPerPixel, rangeMs } = this.props;

    return (
      <TimelineWrapper>
        <ResizeAware
          onlyEvent
          onResize={this.delayedHandleResize}
          style={{ width: '100%', height: '100%' }}
        >
          <TimelineContainer
            panning={isPanning}
            innerRef={this.saveSvgRef}
            onWheel={this.handleZoom}
          >
            <g
              className="timeline-container"
              transform={`translate(${width / 2}, 0)`}
            >
              <title>Scroll to zoom, drag to pan</title>
              <Motion
                style={{
                  focusedTimestampMs: strongSpring(
                    moment(focusedTimestamp).valueOf()
                  ),
                  durationMsPerPixel: strongSpring(durationMsPerPixel),
                  rangeMs: strongSpring(rangeMs),
                }}
              >
                {interpolated =>
                  this.renderAxis({
                    focusedTimestamp: formattedTimestamp(
                      interpolated.focusedTimestampMs
                    ),
                    durationMsPerPixel: interpolated.durationMsPerPixel,
                    rangeMs: interpolated.rangeMs,
                  })
                }
              </Motion>
            </g>
          </TimelineContainer>
        </ResizeAware>
      </TimelineWrapper>
    );
  }
}

Timeline.propTypes = {
  inspectingInterval: PropTypes.bool.isRequired,
  timestampNow: PropTypes.string.isRequired,
  focusedTimestamp: PropTypes.string.isRequired,
  earliestTimestamp: PropTypes.string,
  durationMsPerPixel: PropTypes.number.isRequired,
  rangeMs: PropTypes.number.isRequired,
  deployments: PropTypes.array.isRequired,
  onUpdateVisibleRange: PropTypes.func.isRequired,
  onJump: PropTypes.func.isRequired,
  onZoom: PropTypes.func.isRequired,
  onPan: PropTypes.func.isRequired,
  onRelease: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
};

export default Timeline;
