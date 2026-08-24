{ pkgs ? import <nixpkgs> {} }:

let
  nodejs = pkgs.nodejs_22;
in
pkgs.buildNpmPackage rec {
  pname = "rant";
  version = "0.1.0";

  src = pkgs.lib.cleanSource ./.;

  npmDepsHash = "";  # Run nix-build once to get the correct hash from the error message

  nativeBuildInputs = with pkgs; [
    python3      # Required by better-sqlite3 (node-gyp)
    gnumake
    gcc
    pkg-config
  ];

  buildInputs = with pkgs; [
    nodejs
  ];

  inherit nodejs;

  # Build both server and client
  buildPhase = ''
    runHook preBuild
    npm run build:server
    cd client && npm ci && npm run build && cd ..
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/lib/rant
    cp -r dist $out/lib/rant/
    cp -r drizzle $out/lib/rant/
    cp -r node_modules $out/lib/rant/
    cp package.json $out/lib/rant/

    mkdir -p $out/bin
    cat > $out/bin/rant <<EOF
    #!${pkgs.bash}/bin/bash
    export NODE_ENV=production
    export DATABASE_URL="\''${DATABASE_URL:-./data/rant.db}"
    export PORT="\''${PORT:-3001}"
    exec ${nodejs}/bin/node $out/lib/rant/dist/entry.node.js "\$@"
    EOF
    chmod +x $out/bin/rant

    runHook postInstall
  '';

  meta = with pkgs.lib; {
    description = "RANT — Rack And Networking Tool. Lightweight self-hosted rack layout and cable documentation.";
    homepage = "https://github.com/yourusername/rant";
    license = licenses.gpl3;
    maintainers = [];
    platforms = platforms.linux;
  };
}
