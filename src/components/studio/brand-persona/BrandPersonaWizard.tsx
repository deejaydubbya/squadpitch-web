'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Loader2, CheckCircle, Settings, Trash2, AlertCircle } from 'lucide-react';
import {
  useBrandPersona,
  useUpsertBrandPersona,
  useDeleteBrandPersona,
  useUploadPersonaTrainingImage,
  useRemovePersonaTrainingImage,
  useRecordPersonaConsent,
  useStartPersonaTraining,
  useGeneratePersonaPreviews,
} from '@/hooks/useSquadpitch';
import type {
  PersonaType,
  PersonaUsageSettings,
  BrandPersona,
  BrandStyleProfile,
} from '@/hooks/useSquadpitch';
import { WizardStepIndicator } from './WizardStepIndicator';
import { PersonaTypeStep } from './PersonaTypeStep';
import { UploadTrainingStep } from './UploadTrainingStep';
import { ReviewTrainingStep } from './ReviewTrainingStep';
import { PersonaDetailsStep } from './PersonaDetailsStep';
import { TrainingProgressStep } from './TrainingProgressStep';
import { PreviewResultsStep } from './PreviewResultsStep';
import { PersonaSettingsStep } from './PersonaSettingsStep';
import { StyleProfileStep } from './StyleProfileStep';
import type { WizardStepId } from './personaConstants';

interface Props {
  clientId: string;
}

/** Polling interval for training status (10 seconds). */
const TRAINING_POLL_INTERVAL = 10_000;

function resolveInitialStep(persona: BrandPersona | null | undefined): WizardStepId {
  if (!persona) return 'persona_type';
  if (persona.status === 'COMPLETED') return 'persona_type'; // show summary
  if (persona.status === 'FAILED') return 'training_progress'; // show error
  if (persona.status === 'TRAINING' || persona.status === 'QUEUED') return 'training_progress';
  if (persona.status === 'READY_TO_TRAIN' || persona.imageCount > 0) return 'review_training';
  if (persona.personaType) return 'upload_training';
  return 'persona_type';
}

export function BrandPersonaWizard({ clientId }: Props) {
  const { data: persona, isLoading, refetch } = useBrandPersona(clientId);
  const upsert = useUpsertBrandPersona(clientId);
  const deleteMut = useDeleteBrandPersona(clientId);
  const uploadImage = useUploadPersonaTrainingImage(clientId);
  const removeImage = useRemovePersonaTrainingImage(clientId);
  const recordConsent = useRecordPersonaConsent(clientId);
  const startTraining = useStartPersonaTraining(clientId);
  const generatePreviews = useGeneratePersonaPreviews(clientId);

  const [step, setStep] = useState<WizardStepId | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Set initial step once data loads
  const effectiveStep = useMemo(() => {
    if (step) return step;
    if (isLoading) return null;
    return resolveInitialStep(persona);
  }, [step, isLoading, persona]);

  const images = useMemo(
    () => (Array.isArray(persona?.trainingImages) ? persona!.trainingImages : []),
    [persona]
  );

  // ── Poll training status ─────────────────────────────────────────────

  useEffect(() => {
    const isTraining =
      persona?.status === 'QUEUED' || persona?.status === 'TRAINING';
    if (!isTraining) return;

    const interval = setInterval(() => {
      refetch();
    }, TRAINING_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [persona?.status, refetch]);

  // Auto-advance when training completes while polling
  useEffect(() => {
    if (
      persona?.status === 'COMPLETED' &&
      effectiveStep === 'training_progress'
    ) {
      setStep('preview_results');
    }
  }, [persona?.status, effectiveStep]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleSelectType = useCallback(
    (type: PersonaType) => {
      upsert.mutate(
        { personaType: type },
        { onSuccess: () => setStep('upload_training') }
      );
    },
    [upsert]
  );

  const handleUploadFile = useCallback(
    (file: File) => {
      uploadImage.mutate(file);
    },
    [uploadImage]
  );

  const handleRemoveImage = useCallback(
    (id: string) => {
      removeImage.mutate(id);
    },
    [removeImage]
  );

  const handleSaveDetails = useCallback(
    (data: {
      name: string;
      visualStyle: string;
      usageSettings: PersonaUsageSettings;
      consent: boolean;
    }) => {
      const isBrandStyle = persona?.personaType === 'BRAND_STYLE';

      // Save details first
      upsert.mutate(
        {
          name: data.name,
          visualStyle: data.visualStyle,
          usageSettings: data.usageSettings,
          status: 'READY_TO_TRAIN',
        },
        {
          onSuccess: () => {
            // Record consent
            recordConsent.mutate(undefined, {
              onSuccess: () => {
                if (isBrandStyle) {
                  // BRAND_STYLE: go to style profile step before training
                  setStep('style_profile');
                } else {
                  // AGENT: start training immediately
                  startTraining.mutate(undefined, {
                    onSuccess: () => setStep('training_progress'),
                    onError: () => setStep('training_progress'),
                  });
                }
              },
            });
          },
        }
      );
    },
    [upsert, recordConsent, startTraining, persona?.personaType]
  );

  const handleSaveStyleProfile = useCallback(
    (profile: BrandStyleProfile) => {
      upsert.mutate(
        { styleProfile: profile },
        {
          onSuccess: () => {
            // After saving style profile, start LoRA training
            startTraining.mutate(undefined, {
              onSuccess: () => setStep('training_progress'),
              onError: () => setStep('training_progress'),
            });
          },
        }
      );
    },
    [upsert, startTraining]
  );

  const handleSkipStyleProfile = useCallback(() => {
    // Skip style profile and go directly to training
    startTraining.mutate(undefined, {
      onSuccess: () => setStep('training_progress'),
      onError: () => setStep('training_progress'),
    });
  }, [startTraining]);

  const handleRetryTraining = useCallback(() => {
    startTraining.mutate(undefined, {
      onSuccess: () => {
        refetch();
      },
    });
  }, [startTraining, refetch]);

  const handleRegeneratePreviews = useCallback(() => {
    generatePreviews.mutate();
  }, [generatePreviews]);

  const handleSaveSettings = useCallback(
    (settings: PersonaUsageSettings) => {
      upsert.mutate(
        { usageSettings: settings },
        {
          onSuccess: () => {
            setStep('persona_type');
            setShowWizard(false);
          },
        }
      );
    },
    [upsert]
  );

  const handleDelete = useCallback(() => {
    if (confirm('Delete your AI Brand Persona? This cannot be undone.')) {
      deleteMut.mutate(undefined, {
        onSuccess: () => {
          setStep('persona_type');
          setShowWizard(false);
        },
      });
    }
  }, [deleteMut]);

  // ── Loading ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-white-30" />
      </div>
    );
  }

  // ── Completed summary ────────────────────────────────────────────────

  if (persona?.status === 'COMPLETED' && !showWizard) {
    return (
      <div className="card p-6 space-y-4 max-w-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-green-110/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-accent-green-110" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white-100">
                {persona.name || 'AI Brand Persona'}
              </h2>
              <p className="text-xs text-white-40">
                {persona.personaType === 'AGENT' ? 'Agent Persona' : 'Brand Style'}{' '}
                &middot; {persona.imageCount} training images &middot;{' '}
                {persona.visualStyle || 'Custom'} style
                {persona.providerModelId && ' &middot; Trained'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-green-110/15 text-accent-green-110">
            Active
          </span>
        </div>

        {/* Preview images (real or training fallback) */}
        {(() => {
          const displayImages =
            persona.previewImages && persona.previewImages.length > 0
              ? persona.previewImages.map((p) => ({ id: p.url, url: p.url }))
              : images.slice(0, 6).map((img) => ({ id: img.id, url: img.url }));
          return (
            displayImages.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {displayImages.slice(0, 6).map((img) => (
                  <div
                    key={img.id}
                    className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white-5"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )
          );
        })()}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              setShowWizard(true);
              setStep('persona_settings');
            }}
            className="btn btn-ghost text-xs px-3 py-1.5"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 inline" />
            Edit Settings
          </button>
          <button
            onClick={() => {
              setShowWizard(true);
              setStep('upload_training');
            }}
            className="btn btn-ghost text-xs px-3 py-1.5"
          >
            Edit Training Photos
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMut.isPending}
            className="btn btn-ghost text-xs px-3 py-1.5 text-red-400 hover:text-red-300 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 inline" />
            Delete
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────

  if (!effectiveStep) return null;

  return (
    <div className="card p-6 space-y-6 max-w-3xl">
      <WizardStepIndicator currentStep={effectiveStep} personaType={persona?.personaType} />

      {effectiveStep === 'persona_type' && (
        <PersonaTypeStep
          selected={persona?.personaType}
          onSelect={handleSelectType}
          saving={upsert.isPending}
        />
      )}

      {effectiveStep === 'upload_training' && (
        <UploadTrainingStep
          images={images}
          onUpload={handleUploadFile}
          onRemove={handleRemoveImage}
          uploading={uploadImage.isPending}
          removing={removeImage.isPending}
          onContinue={() => setStep('review_training')}
          personaType={persona?.personaType}
        />
      )}

      {effectiveStep === 'review_training' && (
        <ReviewTrainingStep
          images={images}
          onRemove={handleRemoveImage}
          removing={removeImage.isPending}
          onAddMore={() => setStep('upload_training')}
          onContinue={() => setStep('persona_details')}
        />
      )}

      {effectiveStep === 'persona_details' && (
        <PersonaDetailsStep
          name={persona?.name || ''}
          visualStyle={persona?.visualStyle || null}
          usageSettings={persona?.usageSettings || {}}
          hasConsent={Boolean(persona?.consentAt)}
          onSave={handleSaveDetails}
          saving={upsert.isPending || recordConsent.isPending || startTraining.isPending}
          personaType={persona?.personaType}
        />
      )}

      {effectiveStep === 'style_profile' && (
        <StyleProfileStep
          styleProfile={persona?.styleProfile}
          onSave={handleSaveStyleProfile}
          onSkip={handleSkipStyleProfile}
          saving={upsert.isPending || startTraining.isPending}
        />
      )}

      {effectiveStep === 'training_progress' && (
        <TrainingProgressStep
          status={persona?.status || 'QUEUED'}
          progress={persona?.trainingProgress ?? 0}
          errorMessage={persona?.errorMessage ?? null}
          onRetry={handleRetryTraining}
          retrying={startTraining.isPending}
        />
      )}

      {effectiveStep === 'preview_results' && (
        <PreviewResultsStep
          previewImages={persona?.previewImages ?? null}
          trainingImages={images}
          onRegenerate={handleRegeneratePreviews}
          regenerating={generatePreviews.isPending}
          onEditTraining={() => setStep('upload_training')}
          onContinue={() => setStep('persona_settings')}
        />
      )}

      {effectiveStep === 'persona_settings' && (
        <PersonaSettingsStep
          usageSettings={persona?.usageSettings || {}}
          onSave={handleSaveSettings}
          saving={upsert.isPending}
        />
      )}
    </div>
  );
}
