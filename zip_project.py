import shutil
import os

def zip_project():
    ignore_dirs = {'.next', 'node_modules', '.git', '.gemini', '__pycache__'}
    def ignore_func(directory, contents):
        return [c for c in contents if c in ignore_dirs or c.endswith('.zip') or c.endswith('.log')]

    shutil.copytree('.', 'temp_project', ignore=ignore_func, dirs_exist_ok=True)
    shutil.make_archive('project', 'zip', 'temp_project')
    shutil.rmtree('temp_project')
    print("Project zipped successfully as project.zip")

if __name__ == "__main__":
    zip_project()
