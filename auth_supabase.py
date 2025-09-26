"""
Sistema de autenticação integrado com Supabase
"""
import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import session, request, jsonify, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from models_supabase import SupabaseManager, SupabaseUser, SupabaseRevenda


class SupabaseAuthManager:
    """Gerenciador de autenticação usando Supabase"""

    def __init__(self):
        self.supabase_manager = SupabaseManager()

    def hash_password(self, password):
        """Hash da senha usando Werkzeug"""
        return generate_password_hash(password)

    def verify_password(self, password, password_hash):
        """Verifica se a senha está correta"""
        return check_password_hash(password_hash, password)

    def register_user(self, username, email, password, full_name=None, role='user'):
        """Registra um novo usuário no Supabase"""
        try:
            # Validações
            if not username or len(username) < 3:
                return {'success': False, 'error': 'Nome de usuário deve ter pelo menos 3 caracteres'}

            if not email or '@' not in email:
                return {'success': False, 'error': 'Email inválido'}

            if not password or len(password) < 6:
                return {'success': False, 'error': 'Senha deve ter pelo menos 6 caracteres'}

            # Verifica se usuário já existe
            try:
                existing_user = self.supabase_manager.supabase.table('users').select('*').eq('username', username).execute()
                if existing_user.data:
                    return {'success': False, 'error': 'Nome de usuário já existe'}

                existing_email = self.supabase_manager.supabase.table('users').select('*').eq('email', email).execute()
                if existing_email.data:
                    return {'success': False, 'error': 'Email já está em uso'}
            except Exception as e:
                print(f"Erro ao verificar usuário existente: {e}")

            # Cria novo usuário
            user = SupabaseUser(
                username=username,
                email=email,
                password_hash=self.hash_password(password),
                full_name=full_name or username,
                role=role,
                active=True
            )

            result = self.supabase_manager.create_user(user)

            if result['success']:
                return {'success': True, 'message': 'Usuário registrado com sucesso'}
            else:
                return {'success': False, 'error': f'Erro ao criar usuário: {result.get("error", "Erro desconhecido")}'}

        except Exception as e:
            return {'success': False, 'error': f'Erro interno: {str(e)}'}

    def login_user(self, username, password):
        """Autentica um usuário no Supabase"""
        try:
            # Busca usuário por username ou email
            user_result = self.supabase_manager.supabase.table('users').select('*').or_(f'username.eq.{username},email.eq.{username}').execute()

            if not user_result.data:
                return {'success': False, 'error': 'Usuário não encontrado'}

            user_data = user_result.data[0]

            if not user_data.get('active', True):
                return {'success': False, 'error': 'Conta desativada'}

            if not self.verify_password(password, user_data['password_hash']):
                return {'success': False, 'error': 'Senha incorreta'}

            # Cria sessão no Flask
            session_token = secrets.token_urlsafe(32)

            # Define sessão no Flask
            session['session_token'] = session_token
            session['user_id'] = user_data['id']
            session['username'] = user_data['username']
            session['role'] = user_data.get('role', 'user')
            session['logged_in'] = True

            return {
                'success': True,
                'message': 'Login realizado com sucesso',
                'user': {
                    'id': user_data['id'],
                    'username': user_data['username'],
                    'email': user_data['email'],
                    'full_name': user_data.get('full_name', ''),
                    'role': user_data.get('role', 'user')
                }
            }

        except Exception as e:
            return {'success': False, 'error': f'Erro interno: {str(e)}'}

    def logout_user(self):
        """Faz logout do usuário"""
        try:
            session.clear()
            return {'success': True, 'message': 'Logout realizado com sucesso'}
        except Exception as e:
            return {'success': False, 'error': f'Erro interno: {str(e)}'}

    def get_current_user(self):
        """Retorna dados do usuário atual"""
        try:
            if not session.get('logged_in'):
                return None

            user_id = session.get('user_id')
            if not user_id:
                return None

            # Busca dados atualizados do usuário no Supabase
            user_result = self.supabase_manager.supabase.table('users').select('*').eq('id', user_id).execute()

            if not user_result.data:
                session.clear()
                return None

            user_data = user_result.data[0]

            if not user_data.get('active', True):
                session.clear()
                return None

            return {
                'id': user_data['id'],
                'username': user_data['username'],
                'email': user_data['email'],
                'full_name': user_data.get('full_name', ''),
                'role': user_data.get('role', 'user')
            }

        except Exception as e:
            print(f"Erro ao buscar usuário atual: {e}")
            return None

    def is_authenticated(self):
        """Verifica se usuário está autenticado"""
        return self.get_current_user() is not None

    def is_admin(self):
        """Verifica se usuário atual é administrador"""
        user_data = self.get_current_user()
        return user_data and user_data.get('role') == 'admin'

    def change_password(self, username, old_password, new_password):
        """Altera senha do usuário"""
        try:
            user_result = self.supabase_manager.supabase.table('users').select('*').eq('username', username).execute()

            if not user_result.data:
                return {'success': False, 'error': 'Usuário não encontrado'}

            user_data = user_result.data[0]

            if not self.verify_password(old_password, user_data['password_hash']):
                return {'success': False, 'error': 'Senha atual incorreta'}

            if len(new_password) < 6:
                return {'success': False, 'error': 'Nova senha deve ter pelo menos 6 caracteres'}

            # Atualiza senha no Supabase
            update_result = self.supabase_manager.update_user(user_data['id'], {
                'password_hash': self.hash_password(new_password),
                'updated_at': datetime.utcnow().isoformat()
            })

            if update_result['success']:
                return {'success': True, 'message': 'Senha alterada com sucesso'}
            else:
                return {'success': False, 'error': 'Erro ao alterar senha'}

        except Exception as e:
            return {'success': False, 'error': f'Erro interno: {str(e)}'}

    def create_admin_user(self, username, email, password, full_name):
        """Cria usuário administrador"""
        return self.register_user(username, email, password, full_name, 'admin')

    # Métodos para Revendas
    def create_revenda(self, revenda_data):
        """Cria uma nova revenda"""
        try:
            print(f"DEBUG auth_supabase: Criando revenda com dados: {revenda_data}")
            print(f"DEBUG auth_supabase:municipios_codigos recebidos: {revenda_data.get('municipios_codigos')}")
            print(f"DEBUG auth_supabase: Tipo municipios_codigos: {type(revenda_data.get('municipios_codigos'))}")

            # Criar objeto SupabaseRevenda
            revenda = SupabaseRevenda(
                nome=revenda_data['nome'],
                cnpj=revenda_data['cnpj'],
                cnae=revenda_data.get('cnae', ''), # Adicionado default para cnae
                cor=revenda_data.get('cor', '#4CAF50'), # Adicionado default para cor
                municipios_codigos=revenda_data.get('municipios_codigos', []), # Adicionado default para municipios_codigos
                created_by=revenda_data.get('created_by'), # Adicionado default para created_by
                endereco=revenda_data.get('endereco', ''), # Adicionado campos restantes com defaults
                cidade=revenda_data.get('cidade', ''),
                estado=revenda_data.get('estado', ''),
                cep=revenda_data.get('cep', ''),
                telefone=revenda_data.get('telefone', ''),
                email=revenda_data.get('email', ''),
                responsavel=revenda_data.get('responsavel', ''),
                active=revenda_data.get('active', True)
            )

            print(f"DEBUG auth_supabase: Objeto SupabaseRevenda criado:municipios_codigos = {revenda.municipios_codigos}")

            result = self.supabase_manager.create_revenda(revenda)
            return result
        except Exception as e:
            print(f"DEBUG auth_supabase: Erro ao criar revenda: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def get_revendas(self):
        """Recuperar todas as revendas ativas"""
        try:
            revendas = self.supabase_manager.get_revendas()
            return {'success': True, 'revendas': [r.__dict__ for r in revendas]}

        except Exception as e:
            return {'success': False, 'error': f'Erro ao carregar revendas: {str(e)}'}

    def get_revenda_by_id(self, revenda_id):
        """Busca uma revenda específica por ID"""
        try:
            result = self.supabase_manager.get_revenda_by_id(revenda_id)
            if result['success']:
                revenda_data = result['data']
                print(f"DEBUG auth_supabase: Revenda encontrada: {revenda_data.get('nome')}")
                print(f"DEBUG auth_supabase:municipios_codigos raw: {revenda_data.get('municipios_codigos')}")
                print(f"DEBUG auth_supabase: Type: {type(revenda_data.get('municipios_codigos'))}")
                return {
                    'success': True,
                    'data': revenda_data
                }
            else:
                print(f"DEBUG auth_supabase: Revenda não encontrada: {result['error']}")
                return {'success': False, 'error': result['error']}
        except Exception as e:
            print(f"DEBUG auth_supabase: Erro ao buscar revenda: {e}")
            return {'success': False, 'error': str(e)}

    def update_revenda(self, revenda_id, updates):
        """Atualizar revenda existente"""
        try:
            result = self.supabase_manager.update_revenda(revenda_id, updates)
            return result

        except Exception as e:
            return {'success': False, 'error': f'Erro ao atualizar revenda: {str(e)}'}

    def delete_revenda(self, revenda_id):
        """Soft delete de revenda"""
        try:
            response = self.supabase_manager.supabase.table('revendas').update({
                'active': False
            }).eq('id', revenda_id).execute()

            if response.data:
                return {'success': True, 'data': response.data}
            else:
                return {'success': False, 'error': 'Revenda não encontrada'}

        except Exception as e:
            print(f"Erro ao deletar revenda: {e}")
            return {'success': False, 'error': str(e)}

    # Métodos para Vendedores
    def get_vendedores(self):
        """Recuperar vendedores ativos"""
        try:
            response = self.supabase_manager.supabase.table('vendedores').select('*').eq('active', True).execute()

            vendedores = []
            for vendedor_data in response.data:
                vendedores.append(vendedor_data)

            return {'success': True, 'vendedores': vendedores}

        except Exception as e:
            print(f"Erro ao recuperar vendedores: {e}")
            return {'success': False, 'error': str(e)}

    def create_vendedor(self, vendedor_data):
        """Criar novo vendedor"""
        try:
            # Verificar se o email já existe
            existing_response = self.supabase_manager.supabase.table('vendedores').select('id').eq('email', vendedor_data['email']).eq('active', True).execute()
            if existing_response.data:
                return {'success': False, 'error': 'E-mail já está cadastrado'}

            # Verificar se o CPF já existe
            existing_cpf = self.supabase_manager.supabase.table('vendedores').select('id').eq('cpf', vendedor_data['cpf']).eq('active', True).execute()
            if existing_cpf.data:
                return {'success': False, 'error': 'CPF já está cadastrado'}

            response = self.supabase_manager.supabase.table('vendedores').insert(vendedor_data).execute()

            if response.data:
                return {'success': True, 'data': response.data}
            else:
                return {'success': False, 'error': 'Erro ao criar vendedor'}

        except Exception as e:
            print(f"Erro ao criar vendedor: {e}")
            return {'success': False, 'error': str(e)}

    def update_vendedor(self, vendedor_id, updates):
        """Atualizar vendedor existente"""
        try:
            response = self.supabase_manager.supabase.table('vendedores').update(updates).eq('id', vendedor_id).execute()

            if response.data:
                return {'success': True, 'data': response.data}
            else:
                return {'success': False, 'error': 'Vendedor não encontrado'}

        except Exception as e:
            print(f"Erro ao atualizar vendedor: {e}")
            return {'success': False, 'error': str(e)}

    def delete_vendedor(self, vendedor_id):
        """Soft delete de vendedor"""
        try:
            response = self.supabase_manager.supabase.table('vendedores').update({
                'active': False
            }).eq('id', vendedor_id).execute()

            if response.data:
                return {'success': True, 'data': response.data}
            else:
                return {'success': False, 'error': 'Vendedor não encontrado'}

        except Exception as e:
            print(f"Erro ao deletar vendedor: {e}")
            return {'success': False, 'error': str(e)}

    def get_vendedor_by_id(self, vendedor_id):
        """Recuperar vendedor por ID"""
        try:
            response = self.supabase_manager.supabase.table('vendedores').select('*').eq('id', vendedor_id).eq('active', True).execute()

            if response.data:
                return {'success': True, 'data': response.data[0]}
            else:
                return {'success': False, 'error': 'Vendedor não encontrado'}

        except Exception as e:
            print(f"Erro ao recuperar vendedor: {e}")
            return {'success': False, 'error': str(e)}


# Instância global do gerenciador de autenticação
supabase_auth_manager = SupabaseAuthManager()


def login_required(f):
    """Decorator que exige autenticação"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not supabase_auth_manager.is_authenticated():
            if request.is_json:
                return jsonify({'success': False, 'error': 'Autenticação necessária'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """Decorator que exige permissões de administrador"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not supabase_auth_manager.is_authenticated():
            if request.is_json:
                return jsonify({'success': False, 'error': 'Autenticação necessária'}), 401
            return redirect(url_for('login_page'))

        if not supabase_auth_manager.is_admin():
            if request.is_json:
                return jsonify({'success': False, 'error': 'Permissões de administrador necessárias'}), 403
            return jsonify({'success': False, 'error': 'Acesso negado'}), 403

        return f(*args, **kwargs)
    return decorated_function