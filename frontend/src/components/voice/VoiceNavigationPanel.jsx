import React from 'react';
import {
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  AlertTriangle,
  Compass,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useEvacuation } from '../../hooks/useEvacuation';
import StepIcon from '../common/StepIcon';

export default function VoiceNavigationPanel() {
  const {
    route,
    voiceActive,
    voiceSpeaking,
    voicePaused,
    autoAdvanceVoice,
    setAutoAdvanceVoice,
    currentStepIndex,
    startVoiceGuidance,
    stopVoiceGuidance,
    pauseVoiceGuidance,
    resumeVoiceGuidance,
    repeatVoiceInstruction,
    nextVoiceStep,
    prevVoiceStep,
    activeFloor,
  } = useEvacuation();

  if (route && route.distance === -1) {
    const handleSpeakShelterWarning = () => {
      import('../../services/voiceAssistant').then(({ voiceAssistant }) => {
        voiceAssistant.speak(
          'Attention. No verified safe evacuation route currently exists. All exits and connecting corridors are compromised by hazards. Shelter in place immediately: keep your room door closed to block toxic smoke, stay low to the floor, and await official emergency responders.',
          { priority: true }
        );
      });
    };

    return (
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-900 border-2 border-red-600 text-white rounded-2xl p-5 shadow-2xl mb-6 relative overflow-hidden transition-all animate-in fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-red-700/80 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="font-black text-xs uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={15} /> CRITICAL SAFETY ALERT: SHELTER IN PLACE
            </span>
          </div>
          <button
            onClick={handleSpeakShelterWarning}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow transition-colors"
          >
            <RotateCcw size={13} /> Speak Safety Instructions
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base lg:text-lg font-bold text-white leading-snug">
            No safe exit route currently available from this location.
          </h3>
          <p className="text-xs text-red-200">
            {route.safety_warning || 'All exits or connecting corridors from your location are impassable due to active hazards. Follow official emergency personnel.'}
          </p>
          <div className="bg-red-950/60 border border-red-800/80 rounded-xl p-3 text-xs text-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <div>
              <span className="font-bold text-white block">1. Seal Doors</span>
              Stay in your current room and seal doors/vents with cloth to block smoke.
            </div>
            <div>
              <span className="font-bold text-white block">2. Stay Low</span>
              Keep close to the floor where air is cooler and cleaner.
            </div>
            <div>
              <span className="font-bold text-white block">3. Await Responders</span>
              Signal from windows if safe. Await extraction by trained safety personnel.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!route || !route.steps || route.steps.length === 0) {
    return null;
  }

  const steps = route.steps;
  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const targetExitLabel = route.target_exit?.label || 'Designated Exit';
  const assemblyPoint = route.assembly_point;

  return (
    <div className="bg-slate-900 border-2 border-emerald-500 text-white rounded-2xl p-5 shadow-2xl mb-6 relative overflow-hidden transition-all animate-in fade-in">
      {/* Top Banner with Navigation Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {voiceSpeaking && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                voiceActive ? (voicePaused ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-500'
              }`}
            />
          </span>
          <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Compass size={14} /> Voice Evacuation Assistant
          </span>
          {voiceSpeaking && (
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              Speaking...
            </span>
          )}
          {voicePaused && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Paused
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Destination:</span>
          <span className="font-semibold text-emerald-300 flex items-center gap-1">
            <CheckCircle2 size={13} /> {targetExitLabel}
          </span>
        </div>
      </div>

      {/* Main Google Maps Style Instruction Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Step Icon & Instruction Card */}
        <div className="lg:col-span-8 flex items-start gap-4">
          <div className="bg-emerald-600/30 border border-emerald-500/50 p-3.5 rounded-2xl shrink-0 text-emerald-400 flex items-center justify-center shadow-lg">
            <StepIcon type={currentStep.type} size={30} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <span>
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              <span>·</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200">
                Floor: {currentStep.floor || activeFloor}
              </span>
              {currentStep.distance > 0 && (
                <>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">{currentStep.distance}m</span>
                </>
              )}
            </div>

            <h3 className="text-lg lg:text-xl font-bold tracking-tight text-white leading-snug">
              {currentStep.instruction}
            </h3>

            {currentStep.hazard && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5 pt-1">
                <AlertTriangle size={14} /> Caution: nearby hazard ({currentStep.hazard_label || currentStep.hazard}). Stay on green route.
              </p>
            )}

            {isLastStep && assemblyPoint && (
              <p className="text-xs text-teal-300 flex items-center gap-1.5 pt-1 font-semibold">
                <MapPin size={14} /> Assembly point: {assemblyPoint.label} ({assemblyPoint.distance}m outdoor green zone).
              </p>
            )}
          </div>
        </div>

        {/* Audio and Playback Controls */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-end gap-2.5">
          <div className="flex items-center gap-2">
            {!voiceActive ? (
              <button
                onClick={() => startVoiceGuidance()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-colors"
                title="Start Voice Assistant"
              >
                <Play size={14} fill="currentColor" /> Start Voice
              </button>
            ) : (
              <>
                {voicePaused ? (
                  <button
                    onClick={resumeVoiceGuidance}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Resume Speech"
                  >
                    <Play size={14} fill="currentColor" /> Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseVoiceGuidance}
                    className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Pause Speech"
                  >
                    <Pause size={14} fill="currentColor" /> Pause
                  </button>
                )}

                <button
                  onClick={repeatVoiceInstruction}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs transition-colors"
                  title="Repeat Instruction"
                >
                  <RotateCcw size={15} />
                </button>

                <button
                  onClick={stopVoiceGuidance}
                  className="bg-red-900/60 hover:bg-red-800 text-red-200 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  title="Stop Guidance"
                >
                  <VolumeX size={14} /> Stop
                </button>
              </>
            )}
          </div>

          {/* Step Stepper Buttons and Auto-Advance Control */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            <button
              onClick={() => setAutoAdvanceVoice(!autoAdvanceVoice)}
              className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors ${
                autoAdvanceVoice
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Automatically announce next step when current step speech completes"
            >
              Auto-Advance: {autoAdvanceVoice ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={prevVoiceStep}
              disabled={currentStepIndex === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <SkipBack size={13} /> Prev
            </button>
            <span className="text-xs text-slate-400 font-mono px-1">
              {currentStepIndex + 1}/{totalSteps}
            </span>
            <button
              onClick={nextVoiceStep}
              disabled={isLastStep}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              Next <SkipForward size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
