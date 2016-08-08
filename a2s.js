'use strict';

const Path = require('fire-path');
const Fs = require('fire-fs');
const Globby = require('globby');
const Yargs = require('yargs');

Yargs.help('help').options({
  'src': {
    type: 'string',
    global: true,
    desc: 'source path.'
  },
  'dst': {
    type: 'string',
    global: true,
    desc: 'destination path.'
  }
});


function colorToHex (color) {
    let hR = color.r.toString(16), hG = color.g.toString(16), hB = color.b.toString(16), hA = color.a.toString(16);
    return (color.r < 16 ? ('0' + hR) : hR) + (color.g < 16 ? ('0' + hG) : hG) + (color.b < 16 ? ('0' + hB) : hB) + (color.a < 16 ? ('0' + hA) : hA);
}

function armature2spine (srcPath, exportDir) {
    if (!Fs.existsSync(srcPath)) {
        console.error(`Path [${srcPath}] not exists.`);
        return;
    }

    let spine = {
        skeleton: { 'hash': 'rPoYyBLFG6F0CGZ5wsUEBKDJU9U', 'spine': '3.4.00', 'width': 100, 'height': 100, 'images': './images/' },
        bones: [{ 'name': '__root__' }],
        slots: [],
        skins: {default: {}},
        events: {},
        animations: {}
    };

    let displayDataMap = {};

    function getDisplayName(boneName, displayIndex) {
        let data = displayDataMap[boneName][displayIndex];
        return data ? data.name : '';
    }

    let data = JSON.parse(Fs.readFileSync(srcPath, 'utf8'));
    let armatureData = data.armature_data[0];


    let boneDatas = armatureData.bone_data;
    for (let i = 0; i < boneDatas.length; i++) {
        let boneData = boneDatas[i];

        // bone
        let bone = {name: boneData.name};

        bone.parent = boneData.parent ? boneData.parent : '__root__';

        bone.x = boneData.x;
        bone.y = boneData.y;
        bone.scaleX = boneData.cX;
        bone.scaleY = boneData.cY;
        bone.rotation = -boneData.kX * (180/Math.PI);

        bone.length = Math.sqrt(boneData.arrow_x*boneData.arrow_x + boneData.arrow_y*boneData.arrow_y);

        spine.bones.push(bone);

        // displayDatas
        let displayDatas = boneData.display_data;

        // skins
        let skins = spine.skins.default;
        let skin = skins[boneData.name] = {};

        for (let j = 0; j < displayDatas.length; j++) {
            let displayData = displayDatas[j];

            displayData.name = displayData.name.replace('.png', '');

            let skinData = displayData.skin_data[0];

            if (!skinData) continue;

            skin[displayData.name] = {
                x: skinData.x,
                y: skinData.y,
                rotation: -skinData.kX * (180/Math.PI),
                scaleX: skinData.cX,
                scaleY: skinData.cY,
                width: 100,
                height: 100
            };
        }

        displayDataMap[boneData.name] = displayDatas;

        // slot
        let slot = {name: boneData.name, bone: boneData.name, z: boneData.z};

        spine.slots.push(slot);
    }

    // sort slot
    spine.slots = spine.slots.sort((a, b) => {
        if (a.z > b.z) return 1;
        else if(a.z < b.z) return -1;
        return 0;
    });

    spine.slots.forEach((slot) => {
        slot.z = undefined;
    });

    // animations
    let animationData = data.animation_data[0];
    if (animationData) {
        let movDatas = animationData.mov_data;

        for (let i = 0; i < movDatas.length; i++) {
            let movData = movDatas[i];
            let movName = movData.name;
            let timeScale = movData.sc;

            let movBoneDatas = movData.mov_bone_data;
            let bones = {};
            let slots = {};

            for (let j = 0; j < movBoneDatas.length; j++) {
                let movBoneData = movBoneDatas[j];
                let movBoneName = movBoneData.name;

                bones[movBoneName] = {
                    rotate: [],
                    translate: [],
                    scale: []
                };

                slots[movBoneName] = {
                    color: [],
                    attachment: [],
                };

                let frameDatas = movBoneData.frame_data;
                for (let k = 0; k < frameDatas.length; k++) {
                    let frameData = frameDatas[k];
                    let time = frameData.fi * (1/60) / timeScale;
                    let curve = frameData.tweenFrame ? undefined : 'stepped';

                    // rotate
                    bones[movBoneName].rotate.push({
                        time: time,
                        curve: curve,
                        angle: -frameData.kX * (180/Math.PI)
                    });

                    // translate
                    bones[movBoneName].translate.push({
                        time: time,
                        curve: curve,
                        x: frameData.x,
                        y: frameData.y
                    });

                    // scale
                    bones[movBoneName].scale.push({
                        time: time,
                        curve: curve,
                        x: frameData.cX,
                        y: frameData.cY
                    });

                    // slots

                    // attachment
                    let displayName = getDisplayName(movBoneName, frameData.dI);
                    slots[movBoneName].attachment.push({
                        time: time,
                        curve: curve,
                        name: displayName || null
                    });

                    slots[movBoneName].color.push({
                        time: time,
                        curve: curve,
                        color: frameData.color ? colorToHex(frameData.color) : 'ffffffff'
                    });

                    if (i === 0 && k === 0 && displayName) {
                        let slot = spine.slots.filter(function (slot) {
                            return slot.name === movBoneName;
                        })[0];

                        slot.attachment = displayName;
                    }
                }

                if (slots[movBoneName].color.length === 0) {
                    slots[movBoneName].color = undefined;
                }
                else if (slots[movBoneName].color[0].time !== 0) {
                    let c = slots[movBoneName].color[0];
                    slots[movBoneName].color.splice(0, 0, {
                        time: 0,
                        curve: c.curve,
                        color: c.color
                    });
                }
            }

            boneDatas.forEach((boneData) => {
                if (bones[boneData.name] || slots[boneData.name]) return;

                slots[boneData.name] = {
                    attachment: [{ 'time': 0, 'name': null }]
                };
            });

            spine.animations[movName] = {
                bones: bones,
                slots: slots
            };
        }
    }

    // export files
    if (exportDir) {
        exportDir = Path.join(exportDir, Path.basename(Path.join(srcPath, '../../')));
    }
    else {
        exportDir = Path.join(Path.dirname(srcPath), 'spine');
    }

    let name = armatureData.name;
    let spineJsonPath = Path.join(exportDir, name + '.json');
    Fs.ensureFileSync(spineJsonPath);
    Fs.writeFileSync(spineJsonPath, JSON.stringify(spine, null, 2));

    let srcResourceDir = Path.join(Path.dirname(srcPath), '../Resources');
    let dstResourceDir = Path.join(exportDir, 'images');
    Fs.copySync(srcResourceDir, dstResourceDir);
};


let yargv = Yargs.argv;
let src = yargv.src;
let dst = yargv.dst;

if (!src) return;

if (Fs.isDirSync(src)) {
    let pattern = Path.join(src, '**/Json/*.json');
    Globby(pattern, (err, paths) => {
        if (err) {
            console.err(err);
            return;
        }
        paths.forEach(path => {
            armature2spine(path, dst);
        });
    });
}
else {
    armature2spine(src, dst);
}

