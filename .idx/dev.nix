# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.php82
    pkgs.php82Packages.composer
    pkgs.nodejs_20
    pkgs.nodePackages.nodemon
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "bmewburn.vscode-intelephense-client"
      "bradlc.vscode-tailwindcss"
      "esbenp.prettier-vscode"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          # Run the React frontend
          command = ["npm" "run" "start" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
          # cwd = "frontend"; # Run inside frontend directory
        };
        # You can add a second preview for the backend if needed, or run it through the terminal
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Install backend dependencies
        composer-install = "cd backend && composer install";
        # Setup backend env
        backend-env = "cd backend && cp .env.example .env && php artisan key:generate";
        # Migrate database (using sqlite for simplicity in dev/idx usually, or skip if configuring external db)
        # migrate = "cd backend && touch database/database.sqlite && php artisan migrate --force";
        
        # Install frontend dependencies
        npm-install = "cd frontend && npm install";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Use concurrent running in future if desired, for now we let the user run them manually or via previews
        # run-server = "cd backend && php artisan serve --port 8000"; 
      };
    };
  };
}
