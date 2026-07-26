/**
 * exerciseData.js — the bundled exercise catalogue.
 *
 * Organised on the ExRx.net classification scheme: muscle group → target
 * muscle → equipment, plus mechanics (compound/isolated) and force
 * (push/pull/static). Each entry also carries a link to the matching ExRx
 * directory page for reference.
 *
 * ExRx.net's own database is copyrighted commercial content with no public
 * API, so it is not copied here. Instead, base movements are defined once and
 * expanded across their sensible equipment and stance variations — the same
 * way the movement space is actually organised — with instructions written for
 * this app. That yields several hundred exercises covering every muscle group.
 * Anything still missing, the user can add via "Create exercise".
 */

/* ------------------------------------------------------------------ */
/* equipment: key -> [filter label, display prefix]                    */
/* ------------------------------------------------------------------ */
const E = {
  bb:   ['barbell', 'Barbell'],
  db:   ['dumbbell', 'Dumbbell'],
  cb:   ['cable', 'Cable'],
  mc:   ['machine', 'Machine'],
  lv:   ['leverage machine', 'Lever'],
  sm:   ['smith machine', 'Smith Machine'],
  ez:   ['ez barbell', 'EZ-Bar'],
  kb:   ['kettlebell', 'Kettlebell'],
  bn:   ['band', 'Band'],
  bw:   ['body weight', ''],
  wt:   ['weighted', 'Weighted'],
  tb:   ['trap bar', 'Trap Bar'],
  rg:   ['rings', 'Ring'],
  sl:   ['sled', 'Sled'],
};

export const EQUIPMENT = [...new Set(Object.values(E).map(([label]) => label))].sort();

export const BODY_PARTS = [
  'chest', 'back', 'shoulders', 'upper arms', 'forearms',
  'waist', 'hips', 'thighs', 'calves', 'neck', 'cardio',
];

/** ExRx directory page per muscle group — reference links, not content. */
const EXRX_DIR = {
  chest:        'https://exrx.net/Lists/ExList/ChestWt',
  back:         'https://exrx.net/Lists/ExList/BackWt',
  shoulders:    'https://exrx.net/Lists/ExList/ShouldWt',
  'upper arms': 'https://exrx.net/Lists/ExList/ArmWt',
  forearms:     'https://exrx.net/Lists/ExList/ForeArmWt',
  waist:        'https://exrx.net/Lists/ExList/WaistWt',
  hips:         'https://exrx.net/Lists/ExList/HipsWt',
  thighs:       'https://exrx.net/Lists/ExList/ThighWt',
  calves:       'https://exrx.net/Lists/ExList/CalfWt',
  neck:         'https://exrx.net/Lists/ExList/NeckWt',
  cardio:       'https://exrx.net/Lists/Aerobic',
};

/* ------------------------------------------------------------------ */
/* base movements                                                      */
/*                                                                     */
/* [ name, bodyPart, target, mechanics, force, [equipment], [variants], */
/*   instructions ]                                                    */
/*                                                                     */
/* `{eq}` in the instructions is replaced by the equipment label.       */
/* An empty string in `variants` means "no prefix".                     */
/* ------------------------------------------------------------------ */
const M = [
  /* =========================== CHEST =========================== */
  ['Bench Press', 'chest', 'pectoralis major', 'compound', 'push',
    ['bb', 'db', 'sm', 'cb', 'kb', 'lv'], ['', 'Incline', 'Decline'],
    'Lie back with the feet planted and the shoulder blades pulled together.|Lower the {eq} to the chest with the elbows at roughly 45 degrees.|Press back up until the arms are extended, keeping the ribs down.'],
  ['Chest Fly', 'chest', 'pectoralis major', 'isolated', 'push',
    ['db', 'cb', 'mc', 'bn'], ['', 'Incline', 'Decline'],
    'Start with the arms extended over the chest, elbows slightly bent.|Open the arms wide until a stretch is felt across the chest.|Squeeze the chest to bring the {eq} back together.'],
  ['Push-Up', 'chest', 'pectoralis major', 'compound', 'push',
    ['bw', 'bn', 'wt'], ['', '^Incline', '^Decline', '^Wide-Grip', '^Close-Grip'],
    'Set the hands under the shoulders in a rigid plank.|Lower until the chest nearly touches the floor, elbows tucked.|Press back up without letting the hips sag.'],
  ['Chest Dip', 'chest', 'pectoralis major', 'compound', 'push',
    ['bw', 'lv', 'rg', 'wt'], [''],
    'Support yourself with the arms locked and lean the torso forward.|Lower until the shoulders sit just below the elbows.|Press back up, keeping the forward lean throughout.'],
  ['Pullover', 'chest', 'pectoralis major', 'isolated', 'pull',
    ['db', 'bb', 'cb', 'lv'], [''],
    'Lie across or along a bench with the {eq} held over the chest.|Lower it back behind the head until a stretch is felt.|Pull it back over the chest with the arms nearly straight.'],
  ['Floor Press', 'chest', 'pectoralis major', 'compound', 'push',
    ['bb', 'db', 'kb'], [''],
    'Lie on the floor with the knees bent and the {eq} over the chest.|Lower until the upper arms rest on the floor.|Pause, then press back to lockout.'],
  ['Squeeze Press', 'chest', 'pectoralis major', 'compound', 'push',
    ['db'], [''],
    'Press two dumbbells together hard over the chest.|Lower them as a single unit to the sternum.|Press back up while maintaining the inward squeeze.'],
  ['Landmine Press', 'chest', 'pectoralis major', 'compound', 'push',
    ['bb'], ['', 'Kneeling'],
    'Hold the end of the bar at shoulder height.|Press up and forward along the bar path.|Return under control to the shoulder.'],
  ['Svend Press', 'chest', 'pectoralis major', 'isolated', 'push',
    ['wt'], [''],
    'Press a plate between the palms at chest height.|Extend the arms straight forward while squeezing.|Return to the chest keeping constant pressure.'],

  /* ============================ BACK ============================ */
  ['Pull-Up', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['bw', 'bn', 'lv', 'wt'], ['', '^Wide-Grip', '^Close-Grip', '^Neutral-Grip'],
    'Hang from the bar with an overhand grip and the shoulders set.|Pull the elbows down and back until the chest nears the bar.|Lower under control to a full hang.'],
  ['Chin-Up', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['bw', 'bn', 'lv', 'wt'], [''],
    'Hang with an underhand, shoulder-width grip.|Pull until the chin clears the bar, driving the elbows to the ribs.|Lower slowly to a full hang.'],
  ['Lat Pulldown', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['cb', 'lv', 'bn'], ['', '^Wide-Grip', '^Close-Grip', '^Reverse-Grip', '^Neutral-Grip'],
    'Sit with the thighs braced under the pads.|Pull the bar to the upper chest, leading with the elbows.|Let it rise back to a full stretch without shrugging.'],
  ['Bent-Over Row', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['bb', 'db', 'ez', 'sm', 'kb', 'bn'], ['', '^Reverse-Grip'],
    'Hinge forward to about 45 degrees with a flat back.|Row the {eq} to the lower ribs.|Lower under control without letting the torso rise.'],
  ['Seated Row', 'back', 'trapezius, middle', 'compound', 'pull',
    ['cb', 'lv', 'bn'], ['', '^Wide-Grip', '^Close-Grip'],
    'Sit tall with a slight bend in the knees.|Pull the handle to the navel, squeezing the shoulder blades.|Extend the arms fully without rounding the back.'],
  ['One-Arm Row', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['db', 'cb', 'kb'], [''],
    'Brace one hand and knee on a bench with a flat back.|Row the {eq} to the hip, keeping the shoulder down.|Lower to a full stretch under control.'],
  ['T-Bar Row', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['lv', 'bb'], [''],
    'Straddle the bar with the torso hinged forward.|Row the handles toward the chest.|Lower until the arms are extended.'],
  ['Pendlay Row', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['bb'], [''],
    'Set the torso parallel to the floor with the bar on the ground.|Explosively row the bar to the lower chest.|Return it fully to the floor between reps.'],
  ['Seal Row', 'back', 'trapezius, middle', 'compound', 'pull',
    ['bb', 'db'], [''],
    'Lie face down on a raised bench holding the {eq} beneath.|Row to the bench, squeezing the shoulder blades.|Lower to a full stretch without using the legs.'],
  ['Meadows Row', 'back', 'latissimus dorsi', 'compound', 'pull',
    ['bb'], [''],
    'Stand side-on to a landmine and grip the bar end.|Row it up toward the hip with the torso braced.|Lower under control to a stretch.'],
  ['Inverted Row', 'back', 'trapezius, middle', 'compound', 'pull',
    ['bw', 'rg', 'wt'], [''],
    'Hang beneath a fixed bar with the body straight.|Pull the chest to the bar, keeping the hips up.|Lower until the arms are fully extended.'],
  ['Straight-Arm Pulldown', 'back', 'latissimus dorsi', 'isolated', 'pull',
    ['cb', 'bn'], [''],
    'Stand tall holding a high attachment with straight arms.|Sweep the bar down to the thighs using the lats.|Return slowly to overhead.'],
  ['Shrug', 'back', 'trapezius, upper', 'isolated', 'pull',
    ['bb', 'db', 'sm', 'cb', 'kb', 'tb'], ['', '^Behind-the-Back'],
    'Hold the {eq} at arm’s length with the shoulders relaxed.|Shrug straight up toward the ears without rolling.|Pause at the top, then lower to a full stretch.'],
  ['Face Pull', 'back', 'trapezius, middle', 'isolated', 'pull',
    ['cb', 'bn'], [''],
    'Set the attachment at face height and step back.|Pull the rope toward the forehead, elbows high.|Rotate the hands back at the end range, then return.'],
  ['Deadlift', 'back', 'erector spinae', 'compound', 'pull',
    ['bb', 'db', 'tb', 'kb', 'sm'], ['', '^Romanian', '^Stiff-Leg', '^Sumo', '^Deficit'],
    'Set the {eq} over the mid-foot and hinge to grip it.|Brace the trunk and drive the floor away, keeping the bar close.|Lock out the hips and knees together, then reverse the path.'],
  ['Rack Pull', 'back', 'erector spinae', 'compound', 'pull',
    ['bb'], [''],
    'Set the bar in a rack at knee height.|Brace and pull to a standing lockout.|Lower the bar back to the pins under control.'],
  ['Good Morning', 'back', 'erector spinae', 'compound', 'pull',
    ['bb', 'sm', 'bn'], [''],
    'Rest the {eq} across the upper back.|Push the hips back with a flat back until the torso nears parallel.|Drive the hips forward to stand tall.'],
  ['Back Extension', 'back', 'erector spinae', 'isolated', 'pull',
    ['bw', 'lv', 'wt'], [''],
    'Set the pads at hip level and cross the arms.|Hinge down until a stretch is felt in the hamstrings.|Raise until the torso is in line with the legs — no further.'],
  ['Reverse Hyperextension', 'back', 'erector spinae', 'isolated', 'pull',
    ['bw', 'lv'], [''],
    'Lie face down with the hips at the edge of the pad.|Raise the legs until level with the torso.|Lower slowly without swinging.'],

  /* ========================== SHOULDERS ========================= */
  ['Shoulder Press', 'shoulders', 'deltoid, anterior', 'compound', 'push',
    ['bb', 'db', 'sm', 'mc', 'kb', 'cb', 'lv'], ['', 'Seated', 'Standing'],
    'Start with the {eq} at shoulder height, ribs down.|Press overhead until the arms lock out.|Lower under control to ear height.'],
  ['Arnold Press', 'shoulders', 'deltoid, anterior', 'compound', 'push',
    ['db'], [''],
    'Begin with the palms facing you at chin height.|Rotate the palms outward as you press overhead.|Reverse the rotation on the way down.'],
  ['Push Press', 'shoulders', 'deltoid, anterior', 'compound', 'push',
    ['bb', 'db', 'kb'], [''],
    'Hold the {eq} at the shoulders with a tall trunk.|Dip slightly at the knees, then drive up explosively.|Lock out overhead and lower back to the shoulders.'],
  ['Behind-the-Neck Press', 'shoulders', 'deltoid, anterior', 'compound', 'push',
    ['bb', 'sm'], [''],
    'Rest the bar on the upper traps with a wide grip.|Press overhead, keeping the bar path vertical.|Lower only as far as shoulder mobility allows.'],
  ['Lateral Raise', 'shoulders', 'deltoid, lateral', 'isolated', 'push',
    ['db', 'cb', 'mc', 'bn', 'kb'], ['', 'Seated', 'Leaning', 'Incline'],
    'Hold the {eq} at the sides with a soft elbow bend.|Raise the arms out to shoulder height, leading with the elbows.|Lower slowly without shrugging.'],
  ['Front Raise', 'shoulders', 'deltoid, anterior', 'isolated', 'push',
    ['db', 'bb', 'cb', 'bn', 'wt'], [''],
    'Hold the {eq} in front of the thighs.|Raise to shoulder height with a fixed elbow angle.|Lower under control without swinging.'],
  ['Rear Delt Fly', 'shoulders', 'deltoid, posterior', 'isolated', 'pull',
    ['db', 'cb', 'mc', 'bn'], ['', 'Seated', 'Bent-Over'],
    'Hinge forward with the arms hanging and elbows soft.|Open the arms out to the sides at shoulder height.|Squeeze the rear delts, then lower slowly.'],
  ['Upright Row', 'shoulders', 'deltoid, lateral', 'compound', 'pull',
    ['bb', 'db', 'cb', 'ez', 'sm', 'kb'], [''],
    'Hold the {eq} at shoulder width in front of the thighs.|Pull up to chest height, leading with the elbows.|Lower under control; stop if the shoulders pinch.'],
  ['External Rotation', 'shoulders', 'infraspinatus', 'isolated', 'pull',
    ['cb', 'db', 'bn'], [''],
    'Keep the elbow tucked at the side, bent to 90 degrees.|Rotate the forearm outward without moving the elbow.|Return slowly to the start.'],
  ['Internal Rotation', 'shoulders', 'subscapularis', 'isolated', 'pull',
    ['cb', 'bn'], [''],
    'Keep the elbow pinned to the side, bent to 90 degrees.|Rotate the forearm across the body.|Return under control.'],
  ['Cuban Press', 'shoulders', 'infraspinatus', 'compound', 'push',
    ['db', 'bb'], [''],
    'Start in an upright-row position with the elbows high.|Rotate the forearms up until vertical.|Press overhead, then reverse the whole sequence.'],

  /* ========================= UPPER ARMS ======================== */
  ['Biceps Curl', 'upper arms', 'biceps brachii', 'isolated', 'pull',
    ['bb', 'db', 'ez', 'cb', 'mc', 'bn', 'kb'], ['', 'Seated', 'Incline', '^Preacher', '^Concentration'],
    'Hold the {eq} with the elbows pinned to the sides.|Curl up to shoulder height, supinating where possible.|Lower slowly to full extension.'],
  ['Hammer Curl', 'upper arms', 'brachialis', 'isolated', 'pull',
    ['db', 'cb', 'bn'], ['', 'Incline', 'Cross-Body'],
    'Hold the {eq} with the palms facing each other.|Curl to shoulder height without rotating the wrist.|Lower under control.'],
  ['Spider Curl', 'upper arms', 'biceps brachii', 'isolated', 'pull',
    ['db', 'ez', 'bb'], [''],
    'Lie chest-down on an incline bench with the arms hanging.|Curl the {eq} up without letting the elbows drift.|Lower to a dead hang each rep.'],
  ['Drag Curl', 'upper arms', 'biceps brachii', 'isolated', 'pull',
    ['bb', 'ez', 'sm'], [''],
    'Hold the bar against the thighs.|Curl by dragging it up the torso, elbows travelling back.|Lower along the same path.'],
  ['Zottman Curl', 'upper arms', 'brachialis', 'isolated', 'pull',
    ['db'], [''],
    'Curl up with the palms facing up.|Rotate to palms-down at the top.|Lower slowly in the pronated position.'],
  ['Triceps Pushdown', 'upper arms', 'triceps brachii', 'isolated', 'push',
    ['cb', 'bn'], ['', '^Rope', '^Reverse-Grip', '^V-Bar'],
    'Set a high attachment and tuck the elbows at the sides.|Push down until the arms lock out.|Return to 90 degrees without letting the elbows flare.'],
  ['Triceps Extension', 'upper arms', 'triceps brachii', 'isolated', 'push',
    ['db', 'ez', 'bb', 'cb', 'mc', 'kb'], ['', '^Overhead', '^Lying', '^Seated'],
    'Set the upper arms fixed and the {eq} behind the head or over the chest.|Extend at the elbow only, until the arms straighten.|Lower slowly to a deep stretch.'],
  ['Skull Crusher', 'upper arms', 'triceps brachii', 'isolated', 'push',
    ['ez', 'bb', 'db'], [''],
    'Lie flat with the {eq} held over the shoulders.|Bend at the elbows to lower toward the forehead.|Extend back to the start without moving the upper arms.'],
  ['Close-Grip Bench Press', 'upper arms', 'triceps brachii', 'compound', 'push',
    ['bb', 'sm', 'ez'], [''],
    'Grip the bar at roughly shoulder width.|Lower to the lower chest with the elbows tucked tight.|Press to lockout, driving through the triceps.'],
  ['Triceps Dip', 'upper arms', 'triceps brachii', 'compound', 'push',
    ['bw', 'lv', 'rg', 'wt'], ['', '^Bench'],
    'Support the body with the torso upright.|Lower until the elbows reach about 90 degrees.|Press back to a full lockout.'],
  ['Triceps Kickback', 'upper arms', 'triceps brachii', 'isolated', 'push',
    ['db', 'cb', 'bn'], [''],
    'Hinge forward with the upper arm parallel to the torso.|Extend at the elbow until the arm is straight.|Return slowly, keeping the upper arm still.'],
  ['JM Press', 'upper arms', 'triceps brachii', 'compound', 'push',
    ['bb', 'ez'], [''],
    'Lower the bar toward the upper chest with the elbows forward.|Stop with the forearms near the biceps.|Press back to lockout.'],
  ['Diamond Push-Up', 'upper arms', 'triceps brachii', 'compound', 'push',
    ['bw', 'wt'], [''],
    'Place the hands together under the chest.|Lower with the elbows tracking close to the body.|Press back up to a full lockout.'],

  /* ========================== FOREARMS ========================= */
  ['Wrist Curl', 'forearms', 'wrist flexors', 'isolated', 'pull',
    ['bb', 'db', 'ez', 'cb'], ['', 'Seated', '^Behind-the-Back'],
    'Rest the forearms with the palms facing up.|Curl the {eq} using the wrists only.|Lower to a full stretch.'],
  ['Reverse Wrist Curl', 'forearms', 'wrist extensors', 'isolated', 'pull',
    ['bb', 'db', 'ez', 'cb'], ['', 'Seated'],
    'Rest the forearms with the palms facing down.|Extend the wrists upward as far as possible.|Lower slowly under control.'],
  ['Reverse Curl', 'forearms', 'brachioradialis', 'isolated', 'pull',
    ['bb', 'ez', 'db', 'cb', 'bn'], [''],
    'Grip the {eq} overhand with the elbows at the sides.|Curl to shoulder height keeping the wrists firm.|Lower under control.'],
  ['Farmer’s Walk', 'forearms', 'wrist flexors', 'compound', 'static',
    ['db', 'kb', 'tb'], [''],
    'Pick up a heavy {eq} in each hand.|Walk with the shoulders back and the trunk braced.|Set down under control at the end of the distance.'],
  ['Wrist Roller', 'forearms', 'wrist extensors', 'isolated', 'static',
    ['wt'], [''],
    'Hold the roller at arm’s length in front of you.|Wind the weight up using the wrists alternately.|Unwind slowly under control.'],
  ['Plate Pinch', 'forearms', 'wrist flexors', 'isolated', 'static',
    ['wt'], [''],
    'Pinch a plate between the thumb and fingers.|Hold with the arm at the side.|Set it down before the grip fails completely.'],

  /* =========================== WAIST =========================== */
  ['Crunch', 'waist', 'rectus abdominis', 'isolated', 'pull',
    ['bw', 'cb', 'mc', 'wt'], ['', '^Reverse', '^Bicycle'],
    'Lie on the back with the knees bent.|Curl the shoulder blades off the floor by shortening the abs.|Lower slowly without releasing tension.'],
  ['Sit-Up', 'waist', 'rectus abdominis', 'compound', 'pull',
    ['bw', 'wt', 'lv'], ['', '^Decline'],
    'Anchor the feet and start flat on the back.|Curl up segment by segment to a seated position.|Lower with control, resisting the whole way.'],
  ['Leg Raise', 'waist', 'rectus abdominis', 'isolated', 'pull',
    ['bw', 'lv', 'wt'], ['', '^Hanging', '^Lying'],
    'Start with the legs extended and the pelvis neutral.|Raise the legs to hip height or above, curling the pelvis.|Lower slowly without swinging.'],
  ['Plank', 'waist', 'transverse abdominis', 'isolated', 'static',
    ['bw', 'wt'], ['', '^Side'],
    'Rest on the forearms and toes in a straight line.|Brace the abs and squeeze the glutes.|Hold for time, breathing steadily.'],
  ['Russian Twist', 'waist', 'obliques', 'isolated', 'pull',
    ['bw', 'wt', 'kb', 'mc'], [''],
    'Sit with the knees bent and the chest tall.|Rotate the torso side to side under control.|Keep the movement in the trunk, not the arms.'],
  ['Woodchop', 'waist', 'obliques', 'compound', 'pull',
    ['cb', 'bn', 'kb'], ['', '^High-to-Low', '^Low-to-High'],
    'Set the attachment and stand side-on with the feet planted.|Rotate the trunk and pull diagonally across the body.|Return slowly, resisting the rotation.'],
  ['Pallof Press', 'waist', 'obliques', 'isolated', 'static',
    ['cb', 'bn'], [''],
    'Stand side-on to the anchor with the handle at the chest.|Press straight out, resisting the pull into rotation.|Return to the chest without twisting.'],
  ['Side Bend', 'waist', 'obliques', 'isolated', 'pull',
    ['db', 'cb', 'kb', 'wt'], [''],
    'Stand tall holding the {eq} at one side.|Bend laterally at the waist, then return.|Keep the hips square and avoid leaning forward.'],
  ['Ab Wheel Rollout', 'waist', 'rectus abdominis', 'compound', 'pull',
    ['bw'], [''],
    'Kneel with the wheel under the shoulders and the pelvis tucked.|Roll forward as far as the trunk stays braced.|Pull back using the abs, not the hips.'],
  ['Hollow Body Hold', 'waist', 'rectus abdominis', 'isolated', 'static',
    ['bw'], [''],
    'Lie on the back and press the lower back into the floor.|Lift the shoulders and legs into a shallow dish.|Hold, keeping the lower back flat throughout.'],
  ['Dead Bug', 'waist', 'transverse abdominis', 'isolated', 'static',
    ['bw', 'bn'], [''],
    'Lie on the back with the arms and knees above the hips.|Extend one arm and the opposite leg slowly.|Return without letting the lower back arch.'],
  ['Mountain Climber', 'waist', 'rectus abdominis', 'compound', 'pull',
    ['bw'], [''],
    'Start in a push-up position with the hips level.|Drive the knees to the chest alternately.|Keep the shoulders stacked over the hands.'],
  ['Dragon Flag', 'waist', 'rectus abdominis', 'compound', 'pull',
    ['bw'], [''],
    'Grip a bench behind the head and lift to the shoulders.|Lower the straight body slowly toward the bench.|Raise back up without breaking at the hips.'],

  /* ============================ HIPS =========================== */
  ['Hip Thrust', 'hips', 'gluteus maximus', 'compound', 'push',
    ['bb', 'db', 'lv', 'bn', 'sm', 'bw'], ['', '^Single-Leg'],
    'Rest the upper back on a bench with the {eq} over the hips.|Drive the hips up to full extension, ribs down.|Lower under control without touching down.'],
  ['Glute Bridge', 'hips', 'gluteus maximus', 'compound', 'push',
    ['bw', 'bb', 'db', 'bn'], ['', '^Single-Leg'],
    'Lie on the back with the knees bent and heels close.|Drive the hips up, squeezing the glutes hard.|Lower slowly to just above the floor.'],
  ['Hip Abduction', 'hips', 'gluteus medius', 'isolated', 'push',
    ['mc', 'cb', 'bn'], ['', 'Seated', 'Standing'],
    'Set the pad or strap against the outer thigh.|Drive the leg out to the side.|Return slowly against the resistance.'],
  ['Hip Adduction', 'hips', 'adductors', 'isolated', 'pull',
    ['mc', 'cb', 'bn'], ['', 'Seated', 'Standing'],
    'Set the pad or strap against the inner thigh.|Pull the leg toward the midline.|Return slowly to a stretch.'],
  ['Glute Kickback', 'hips', 'gluteus maximus', 'isolated', 'push',
    ['cb', 'bn', 'lv', 'bw'], [''],
    'Attach the resistance at the ankle and hinge slightly.|Drive the leg back and up, squeezing the glute.|Return under control without arching the back.'],
  ['Lunge', 'hips', 'gluteus maximus', 'compound', 'push',
    ['db', 'bb', 'kb', 'sm', 'bw'], ['', '^Walking', '^Reverse', '^Lateral', '^Curtsy'],
    'Step into a split stance with the trunk upright.|Lower until the back knee nears the floor.|Drive through the front heel to return.'],
  ['Step-Up', 'hips', 'gluteus maximus', 'compound', 'push',
    ['db', 'bb', 'kb', 'bw'], ['', '^Lateral'],
    'Set one foot fully on a knee-height box.|Drive through that heel to stand tall on the box.|Lower slowly under control; do not push off the trailing foot.'],
  ['Kettlebell Swing', 'hips', 'gluteus maximus', 'compound', 'pull',
    ['kb', 'db'], ['', '^Single-Arm'],
    'Hinge at the hips and hike the {eq} back between the legs.|Snap the hips forward to float it to chest height.|Let it fall back into the next hinge.'],
  ['Hip Hinge', 'hips', 'gluteus maximus', 'compound', 'pull',
    ['bb', 'db', 'kb', 'bn'], [''],
    'Stand tall with a soft knee bend.|Push the hips straight back, keeping the spine neutral.|Drive the hips forward to stand.'],

  /* =========================== THIGHS ========================== */
  ['Back Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['bb', 'sm', 'lv'], ['', '^Pause', '^Box'],
    'Set the bar across the upper back and brace hard.|Break at the hips and knees together, descending to at least parallel.|Drive up through the mid-foot without letting the hips shoot back.'],
  ['Front Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['bb', 'sm', 'kb', 'db'], [''],
    'Rack the {eq} on the front of the shoulders with the elbows high.|Squat down keeping the torso as upright as possible.|Drive up while holding the elbows lifted.'],
  ['Goblet Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['kb', 'db'], [''],
    'Hold the {eq} at chest height against the sternum.|Squat between the knees, keeping the chest tall.|Drive back up through the whole foot.'],
  ['Hack Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['lv', 'bb'], [''],
    'Set the shoulders under the pads with the feet mid-platform.|Descend to at least parallel under control.|Press through the heels without locking out hard.'],
  ['Split Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['db', 'bb', 'kb', 'sm', 'bw'], ['', '^Bulgarian'],
    'Set a long split stance, rear foot elevated if Bulgarian.|Lower straight down until the front thigh is parallel.|Drive up through the front heel.'],
  ['Zercher Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['bb'], [''],
    'Hold the bar in the crooks of the elbows.|Squat down with the trunk upright and elbows inside the knees.|Stand up while keeping the bar tight to the body.'],
  ['Overhead Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['bb', 'kb', 'db'], [''],
    'Hold the {eq} locked out overhead with an active shoulder.|Squat to depth keeping the weight over the mid-foot.|Stand without letting the arms drift forward.'],
  ['Sissy Squat', 'thighs', 'quadriceps', 'isolated', 'push',
    ['bw', 'lv', 'wt'], [''],
    'Rise onto the balls of the feet with the hips locked out.|Lean back and bend the knees, keeping a straight hip line.|Return by extending the knees only.'],
  ['Pistol Squat', 'thighs', 'quadriceps', 'compound', 'push',
    ['bw', 'kb'], [''],
    'Balance on one leg with the other extended forward.|Lower slowly to the bottom position.|Drive back up without touching the free foot down.'],
  ['Leg Press', 'thighs', 'quadriceps', 'compound', 'push',
    ['lv', 'mc'], ['', '^Single-Leg', '^Narrow-Stance', '^Wide-Stance'],
    'Set the feet shoulder width on the platform.|Lower until the knees reach roughly 90 degrees.|Press back without locking the knees out hard.'],
  ['Leg Extension', 'thighs', 'quadriceps', 'isolated', 'push',
    ['lv', 'mc', 'bn'], ['', '^Single-Leg'],
    'Set the pad just above the ankles.|Extend the knees fully and pause.|Lower slowly against the resistance.'],
  ['Leg Curl', 'thighs', 'hamstrings', 'isolated', 'pull',
    ['lv', 'mc', 'bn'], ['^Lying', '^Seated', '^Standing'],
    'Set the pad against the lower calves.|Curl the heels toward the glutes as far as possible.|Return slowly without letting the weight drop.'],
  ['Nordic Curl', 'thighs', 'hamstrings', 'isolated', 'pull',
    ['bw'], [''],
    'Kneel with the ankles anchored and the hips locked out.|Lower the body forward as slowly as possible.|Catch with the hands, then pull back using the hamstrings.'],
  ['Glute-Ham Raise', 'thighs', 'hamstrings', 'compound', 'pull',
    ['bw', 'lv', 'wt'], [''],
    'Set the feet against the plate with the thighs on the pad.|Lower the torso under control to horizontal.|Pull back up using the hamstrings and glutes.'],
  ['Romanian Deadlift', 'thighs', 'hamstrings', 'compound', 'pull',
    ['bb', 'db', 'kb', 'sm'], ['', '^Single-Leg'],
    'Hold the {eq} at the hips with soft knees.|Push the hips back, sliding the weight down the legs.|Stand tall by driving the hips forward.'],

  /* =========================== CALVES ========================== */
  ['Standing Calf Raise', 'calves', 'gastrocnemius', 'isolated', 'push',
    ['mc', 'lv', 'bb', 'db', 'sm', 'kb', 'bw'], ['', '^Single-Leg'],
    'Stand with the balls of the feet on the platform.|Rise onto the toes as high as possible and pause.|Lower to a deep stretch under control.'],
  ['Seated Calf Raise', 'calves', 'soleus', 'isolated', 'push',
    ['mc', 'lv', 'bb', 'db'], [''],
    'Set the pad across the lower thighs.|Push through the balls of the feet to full extension.|Lower slowly to a full stretch.'],
  ['Donkey Calf Raise', 'calves', 'gastrocnemius', 'isolated', 'push',
    ['lv', 'bw'], [''],
    'Hinge at the hips with the balls of the feet on a block.|Rise onto the toes as high as possible.|Lower to a stretch under control.'],
  ['Leg Press Calf Raise', 'calves', 'gastrocnemius', 'isolated', 'push',
    ['lv'], [''],
    'Place the balls of the feet at the base of the platform.|Press through the toes to full plantar flexion.|Return slowly to a stretch.'],
  ['Tibialis Raise', 'calves', 'tibialis anterior', 'isolated', 'pull',
    ['bw', 'wt', 'mc', 'bn'], [''],
    'Stand with the back to a wall and the heels forward.|Pull the toes up toward the shins.|Lower slowly under control.'],

  /* ============================ NECK =========================== */
  ['Neck Flexion', 'neck', 'sternocleidomastoid', 'isolated', 'pull',
    ['bw', 'wt', 'mc', 'bn'], [''],
    'Lie face up or set the harness against the forehead.|Tuck the chin and flex the neck forward.|Return slowly through the full range.'],
  ['Neck Extension', 'neck', 'splenius', 'isolated', 'pull',
    ['bw', 'wt', 'mc', 'bn'], [''],
    'Lie face down or set the harness on the back of the head.|Extend the neck backward under control.|Return slowly to neutral.'],
  ['Neck Lateral Flexion', 'neck', 'sternocleidomastoid', 'isolated', 'pull',
    ['bw', 'wt', 'bn'], [''],
    'Lie on one side or set the resistance at the side of the head.|Bend the neck laterally toward the shoulder.|Return slowly and repeat on the other side.'],

  /* ====================== OLYMPIC / POWER ====================== */
  ['Clean', 'thighs', 'quadriceps', 'compound', 'pull',
    ['bb', 'db', 'kb'], ['', '^Power', '^Hang', '^Hang Power'],
    'Set up over the {eq} as for a deadlift.|Extend the hips and knees explosively, then pull under.|Receive at the shoulders and stand to lockout.'],
  ['Snatch', 'shoulders', 'deltoid, anterior', 'compound', 'pull',
    ['bb', 'db', 'kb'], ['', '^Power', '^Hang'],
    'Take a wide grip and set the back before the pull.|Extend explosively and pull under the {eq}.|Receive it locked out overhead, then stand.'],
  ['Clean and Jerk', 'thighs', 'quadriceps', 'compound', 'push',
    ['bb'], [''],
    'Clean the bar to the shoulders and stand tall.|Dip and drive, then split or push under the bar.|Recover the feet and finish locked out overhead.'],
  ['Jerk', 'shoulders', 'deltoid, anterior', 'compound', 'push',
    ['bb'], ['^Push', '^Split'],
    'Start with the bar racked on the shoulders.|Dip vertically and drive the bar off the shoulders.|Punch under to lockout, then recover to standing.'],
  ['High Pull', 'back', 'trapezius, upper', 'compound', 'pull',
    ['bb', 'db', 'kb'], [''],
    'Set up as for a deadlift with a hip hinge.|Extend explosively and pull the {eq} to chest height.|Lower under control and reset.'],
  ['Thruster', 'thighs', 'quadriceps', 'compound', 'push',
    ['bb', 'db', 'kb'], [''],
    'Hold the {eq} at the shoulders and squat to depth.|Drive up out of the squat and carry the momentum overhead.|Lower back to the shoulders for the next rep.'],

  /* =========================== CARDIO ========================== */
  ['Run', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['bw'], ['', 'Trail', 'Interval', 'Tempo', 'Long-Distance'],
    'Warm up with five minutes of easy jogging.|Hold the target pace with a tall, relaxed posture.|Cool down gradually rather than stopping abruptly.'],
  ['Treadmill Run', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['mc'], ['', 'Incline'],
    'Set a comfortable pace and incline before starting.|Run tall, landing under the hips rather than reaching.|Reduce the pace gradually for the last few minutes.'],
  ['Rowing Machine', 'cardio', 'cardiovascular system', 'compound', 'pull',
    ['mc'], ['', 'Interval'],
    'Drive with the legs first, then swing the torso back.|Finish by pulling the handle to the lower ribs.|Reverse the sequence exactly on the recovery.'],
  ['Stationary Bike', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['mc'], ['', 'Recumbent', 'Spin', 'Interval'],
    'Set the saddle so the knee is slightly bent at full extension.|Hold a steady cadence at the target resistance.|Ease off gradually to cool down.'],
  ['Air Bike', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['mc'], ['', 'Interval'],
    'Grip the handles and set the feet on the pedals.|Drive arms and legs together at a hard, steady effort.|Recover at a slow cadence between intervals.'],
  ['Elliptical', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['mc'], [''],
    'Stand tall with a light grip on the handles.|Drive through the legs at a steady cadence.|Adjust incline or resistance for intervals.'],
  ['Stair Climber', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['mc'], [''],
    'Stand upright without leaning on the rails.|Take full steps at a steady rate.|Keep the core engaged throughout.'],
  ['Ski Erg', 'cardio', 'cardiovascular system', 'compound', 'pull',
    ['mc'], [''],
    'Start tall with the handles overhead.|Drive down through the trunk and pull past the hips.|Return smoothly to the overhead position.'],
  ['Swim', 'cardio', 'cardiovascular system', 'compound', 'pull',
    ['bw'], ['', 'Freestyle', 'Breaststroke', 'Interval'],
    'Warm up with a few easy lengths.|Hold a steady stroke rate and breathing rhythm.|Ease down over the final lengths.'],
  ['Jump Rope', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['bw'], [''],
    'Keep the elbows close and turn the rope with the wrists.|Jump just high enough to clear the rope.|Land softly on the balls of the feet.'],
  ['Burpee', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['bw'], [''],
    'Drop into a squat and kick the feet back to a plank.|Perform a push-up, then jump the feet in.|Explode upward into a jump and repeat.'],
  ['Box Jump', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['bw'], [''],
    'Stand a short step from the box with the feet hip width.|Swing the arms and jump, landing softly in a quarter squat.|Step down rather than jumping down.'],
  ['Sled Push', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['sl'], [''],
    'Set the hands high or low on the uprights with the arms locked.|Drive with short, powerful steps and a low torso angle.|Keep the effort continuous for the target distance.'],
  ['Sled Drag', 'cardio', 'cardiovascular system', 'compound', 'pull',
    ['sl'], [''],
    'Face away from the sled with the straps at the hips.|Lean forward and drive through the legs.|Maintain a steady pace for the target distance.'],
  ['Battle Ropes', 'cardio', 'cardiovascular system', 'compound', 'pull',
    ['bw'], [''],
    'Hold one rope end in each hand in a quarter squat.|Drive alternating waves down the ropes.|Keep the trunk braced and the hips back.'],
  ['High Knees', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['bw'], [''],
    'Run on the spot driving the knees to hip height.|Stay on the balls of the feet.|Keep the arms driving in rhythm.'],
  ['Jumping Jack', 'cardio', 'cardiovascular system', 'compound', 'push',
    ['bw'], [''],
    'Start with the feet together and arms at the sides.|Jump the feet wide while raising the arms overhead.|Return to the start and repeat at a steady rhythm.'],
];

/* ------------------------------------------------------------------ */
/* popularity                                                          */
/*                                                                     */
/* Used as the fallback ordering for the "Most used" sort, before the   */
/* user has enough history of their own.                               */
/*                                                                     */
/* There is no licensable public dataset of exercise popularity to pull */
/* from, so this is an editorial ordering of the movements that show up */
/* in mainstream strength programming — not measured data. Reorder the  */
/* list to taste; nothing else depends on it.                          */
/* ------------------------------------------------------------------ */
const POPULAR = [
  'Bench Press', 'Back Squat', 'Deadlift', 'Shoulder Press', 'Lat Pulldown',
  'Biceps Curl', 'Bent-Over Row', 'Pull-Up', 'Leg Press', 'Triceps Pushdown',
  'Romanian Deadlift', 'Lateral Raise', 'Seated Row', 'Chest Fly', 'Hip Thrust',
  'Leg Curl', 'Leg Extension', 'Push-Up', 'Lunge', 'Chin-Up',
  'Standing Calf Raise', 'Plank', 'Crunch', 'Hammer Curl', 'Skull Crusher',
  'Split Squat', 'Front Squat', 'Face Pull', 'Shrug', 'Triceps Extension',
  'Chest Dip', 'One-Arm Row', 'Rear Delt Fly', 'Close-Grip Bench Press',
  'Goblet Squat', 'Leg Raise', 'Seated Calf Raise', 'Glute Bridge',
  'Kettlebell Swing', 'Upright Row', 'Step-Up', 'Triceps Dip', 'Good Morning',
  'Reverse Curl', 'Back Extension', 'Russian Twist', 'Hip Abduction', 'Run',
];

/** Equipment tiers — a barbell bench press outranks a kettlebell one. */
const EQUIP_TIER = {
  bb: 0, db: 0, cb: -1, mc: -1, lv: -1, bw: -1,
  sm: -2, ez: -2, kb: -2, bn: -3, wt: -3, tb: -3, rg: -4, sl: -4,
};

function popularityOf(base, equipKey, variant) {
  const i = POPULAR.indexOf(base);
  const rank = i === -1 ? 0 : POPULAR.length - i;   // 48 (top) .. 1
  const plain = variant === '' ? 2 : 0;             // the un-prefixed form leads
  return rank * 10 + plain + (EQUIP_TIER[equipKey] ?? -3);
}

/* ------------------------------------------------------------------ */
/* expansion                                                           */
/* ------------------------------------------------------------------ */

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Cardio movements are already named by their machine ("Rowing Machine"), so
 * the equipment prefix is dropped there to avoid "Machine Rowing Machine".
 *
 * A variant prefixed with `^` sits *after* the equipment word rather than
 * before it, which is how the lift is conventionally named: `^Romanian` gives
 * "Barbell Romanian Deadlift", while plain `Incline` gives "Incline Barbell
 * Bench Press".
 */
function buildName(variant, equipKey, base, bodyPart) {
  const prefix = bodyPart === 'cardio' ? '' : E[equipKey][1];
  return variant.startsWith('^')
    ? [prefix, variant.slice(1), base].filter(Boolean).join(' ')
    : [variant, prefix, base].filter(Boolean).join(' ');
}

function expand() {
  const out = [];
  const seen = new Set();

  for (const [base, bodyPart, target, mechanics, force, equips, variants, ins] of M) {
    for (const variant of variants) {
      for (const eq of equips) {
        const [label] = E[eq];
        const name = buildName(variant, eq, base, bodyPart);
        const id = `ex-${slug(name)}`;
        if (seen.has(id)) continue;
        seen.add(id);

        out.push({
          id,
          name,
          bodyPart,
          target,
          equipment: label,
          mechanics,
          force,
          gifUrl: null,
          exrxUrl: EXRX_DIR[bodyPart] ?? null,
          popularity: popularityOf(base, eq, variant),
          instructions: ins.replaceAll('{eq}', label).split('|'),
        });
      }
    }
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const EXERCISES = expand();
export const MECHANICS = ['compound', 'isolated'];
export const FORCES = ['push', 'pull', 'static'];
