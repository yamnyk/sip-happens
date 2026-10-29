import { Link } from "react-router";
import { strings } from "#shared/strings.js";
import { buttonClass } from "#shared/ui/Button.js";
import { ErrorText, PageStatus, PageTitle } from "#shared/ui/Status.js";
import { DrinkNameField } from "./DrinkNameField.js";
import { DrinkTypeField } from "./DrinkTypeField.js";
import { SaveBar } from "./SaveBar.js";
import { StageOtherHint } from "./StageOtherHint.js";
import { StagePanel } from "./StagePanel.js";
import { StageTabs } from "./StageTabs.js";
import { reviewStrings as s } from "./strings.js";
import { useReviewForm } from "./useReviewForm.js";

/** Create or edit the current user's review; also creates the drink when it is new. */
export function ReviewFormPage() {
  const f = useReviewForm();
  const { picker, state, stage } = f;
  const { drink, effectiveType, group } = picker;

  if (f.isLoading) return <PageStatus>{strings.common.loading}</PageStatus>;
  if (f.isError)
    return <PageStatus tone="error">{strings.common.error}</PageStatus>;
  if (f.notFound) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <p className="text-neutral-200">{s.drinkNotFound}</p>
        <Link to="/add" className={buttonClass({ variant: "link" })}>
          {s.toAdd}
        </Link>
      </div>
    );
  }

  const otherStage = stage === "first" ? "final" : "first";

  return (
    <div className="flex flex-col gap-5 py-2">
      <PageTitle>{f.myReview ? s.editTitle : s.addTitle}</PageTitle>

      <DrinkNameField
        drink={drink}
        name={picker.name}
        suggestions={picker.suggestions}
        exactMatch={picker.exactMatch}
        subtypesById={f.subtypesById}
        onNameChange={f.changeName}
        onPick={f.pickDrink}
        onChangeDrink={f.changeDrink}
      />

      <DrinkTypeField
        drink={drink}
        type={picker.type}
        conflict={picker.conflict}
        subtypesById={f.subtypesById}
        subtype={picker.subtype}
        onChooseType={f.chooseType}
        onPick={f.pickDrink}
      />

      {!effectiveType || !group || !state ? (
        <p className="text-sm text-neutral-500">{s.chooseTypeFirst}</p>
      ) : (
        <>
          <StageTabs stage={stage} state={state} onSelect={f.setStage} />
          <StagePanel
            stage={stage}
            effectiveType={effectiveType}
            stageDraft={f.draft[stage]}
            stageState={state[stage]}
            total={f.total}
            onScore={(key, v) => f.setScore(stage, key, v)}
            onNote={(note) => f.setNote(stage, note)}
          />
          {state[otherStage].status === "invalid" && (
            <StageOtherHint otherStage={otherStage} onSelect={f.setStage} />
          )}
        </>
      )}

      {f.error && <ErrorText>{f.error}</ErrorText>}

      <SaveBar
        saving={f.saving}
        disabled={!f.canSubmit}
        onSave={() => void f.onSave()}
      />
    </div>
  );
}
