#!/usr/bin/env bash
# Converts the artists' .fbx files into .glb (binary glTF) files in resources/models/.
#
# Why: FBX is a closed, complicated format. glTF is the open standard made for real-time 3D, and
# simple enough that the game reads it with its own small loader (src/gltf-loader.js).
# The game only uses the .glb files; run this script again only if you add or change an .fbx file.
#
# It uses FBX2glTF (https://github.com/godotengine/FBX2glTF), downloaded from npm into a temporary folder.
set -euo pipefail
cd "$(dirname "$0")/.."

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
(cd "$workdir" && npm pack --silent fbx2gltf@0.9.7-p1 >/dev/null && tar xzf fbx2gltf-*.tgz)
converter="$workdir/package/bin/$(uname -s)/FBX2glTF"
chmod +x "$converter"

# convert <input.fbx> <output folder> [output name]
convert() {
	local input="$1" folder="resources/models/$2" name="${3:-$(basename "$1" .fbx)}"
	mkdir -p "$folder"
	"$converter" --binary --input "$input" --output "$folder/$name" >/dev/null
	echo "$folder/$name.glb"
}

# The knight and his animations (one animation per file).
convert resources/guard/castle_guard_01.fbx knight knight
for animation in Idle Walk Run Slash Death; do
	convert "resources/guard/Sword And Shield $animation.fbx" knight "$(echo "$animation" | tr '[:upper:]' '[:lower:]')"
done

# The girl and her animation.
convert resources/girl/peasant_girl.fbx girl girl
convert "resources/girl/Standing Idle.fbx" girl idle

# Monsters (their animations are inside the same file) and weapons.
for file in resources/monsters/FBX/*.fbx; do convert "$file" monsters; done
for file in resources/weapons/FBX/*.fbx; do convert "$file" weapons; done

# Trees: only the kinds the game uses (see TREE_TYPES in src/scenery.js). Add more kinds here.
for kind in CommonTree CommonTree_Dead BirchTree BirchTree_Dead Willow Willow_Dead PineTree; do
	for variant in 1 2 3 4 5; do convert "resources/nature/FBX/${kind}_${variant}.fbx" trees; done
done

# The converter unpacks embedded pictures into "*.fbm" folders next to the .fbx files; they are not needed.
rm -rf resources/*/*.fbm
