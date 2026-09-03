{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    python3
    gnumake
    gcc
    pkg-config
  ];

  shellHook = ''
    echo "RANT dev shell ready. Node $(node -v), Python $(python3 --version)"
  '';
}
