import os

def generate_formatted_tree(startpath):
    tree_str = '# Structure de notre projet POS Restaurant\n\n```text\nrestaurant/\n'
    
    comments = {
        '.github': 'Configuration GitHub',
        'workflows': 'Workflows CI/CD',
        'ci.yml': 'Tests automatisés',
        'src': 'Code source de l\'application',
        'app': 'App Router Next.js',
        'api': 'Routes API',
        'components': 'Composants React',
        'ui': 'Design system',
        'lib': 'Utilitaires et services métier',
        'prisma': 'Base de données ORM',
        'schema.prisma': 'Schéma de base de données',
        'public': 'Fichiers statiques',
        'tests': 'Tests',
        'e2e': 'Tests End-to-End',
        'unit': 'Tests unitaires',
        'k8s': 'Manifestes Kubernetes',
        'docker-compose.yml': 'Configuration Docker locale',
        'package.json': 'Dépendances du projet',
        'middleware.ts': 'Middleware (auth, routing)',
        'next.config.ts': 'Configuration Next.js'
    }

    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next', 'scratch']]
        dirs.sort()
        files.sort()
        
        level = root.replace(startpath, '').count(os.sep)
        if level == 0:
            indent = ''
        else:
            indent = '│   ' * (level - 1) + '├── '
            
        if root != startpath:
            dir_name = os.path.basename(root)
            comment = f'  # {comments.get(dir_name)}' if dir_name in comments else ''
            padded_name = f'📁 {dir_name}/'.ljust(30)
            tree_str += f'{indent}{padded_name}{comment}\n'
            
        subindent = '│   ' * level + '├── '
        for i, f in enumerate(files):
            is_last = (i == len(files) - 1) and not dirs
            prefix = '│   ' * level + ('└── ' if is_last else '├── ')
            
            comment = f'  # {comments.get(f)}' if f in comments else ''
            padded_name = f.ljust(30)
            tree_str += f'{prefix}{padded_name}{comment}\n'
            
    tree_str += '```\n'
    return tree_str

content = generate_formatted_tree('/home/hp/Documents/Iaprojet/restaurant')
with open('/home/hp/Documents/Iaprojet/restaurant/project_structure.md', 'w') as f:
    f.write(content)
