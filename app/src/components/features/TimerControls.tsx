import React, { memo } from 'react';
import { useAppState } from '../../store/AppContext';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

const TimerControls: React.FC = memo(() => {
  const { state, dispatch } = useAppState();

  const handleStartTimer = () => {
    dispatch({ type: 'START_TIMER' });
  };

  const handleStopTimer = () => {
    dispatch({ type: 'STOP_TIMER' });
  };

  const handleResetTimer = () => {
    dispatch({ type: 'RESET_TIMER' });
  };

  return (
    <div className="timer-controls">
      <Button 
        className={`timer-btn start-btn ${state.timer.isRunning ? 'hidden' : ''}`}
        onClick={handleStartTimer}
      >
        <Icon name="play" />
      </Button>
      
      <Button 
        className={`timer-btn stop-btn ${!state.timer.isRunning ? 'hidden' : ''}`}
        onClick={handleStopTimer}
      >
        <Icon name="pause" />
      </Button>
      
      <Button 
        className="timer-btn reset-btn"
        onClick={handleResetTimer}
      >
        <Icon name="reset" />
      </Button>
    </div>
  );
});

TimerControls.displayName = 'TimerControls';

export default TimerControls;