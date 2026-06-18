import base64
import requests
from config import Config

GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
TOKEN_SCOPE = 'https://graph.microsoft.com/.default'


class GraphMailError(Exception):
    pass


def _get_access_token():
    tenant = Config.MS_GRAPH_TENANT_ID
    client_id = Config.MS_GRAPH_CLIENT_ID
    client_secret = Config.MS_GRAPH_CLIENT_SECRET

    missing = [name for name, value in (
        ('MS_GRAPH_TENANT_ID', tenant),
        ('MS_GRAPH_CLIENT_ID', client_id),
        ('MS_GRAPH_CLIENT_SECRET', client_secret),
    ) if not value]
    if missing:
        raise GraphMailError('Microsoft Graph credentials are not configured: ' + ', '.join(missing))

    token_url = f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token'
    try:
        resp = requests.post(
            token_url,
            data={
                'client_id': client_id,
                'client_secret': client_secret,
                'scope': TOKEN_SCOPE,
                'grant_type': 'client_credentials',
            },
            timeout=30,
        )
    except requests.RequestException as exc:
        raise GraphMailError(f'Failed to reach Microsoft identity platform: {exc}') from exc

    if not resp.ok:
        raise GraphMailError(f'Failed to obtain Graph access token ({resp.status_code}): {resp.text}')

    token = (resp.json() or {}).get('access_token')
    if not token:
        raise GraphMailError('Graph token response did not include an access_token.')
    return token


def _build_recipients(addresses):
    if not addresses:
        return []
    if isinstance(addresses, str):
        addresses = [addresses]
    recipients = []
    for addr in addresses:
        addr = (addr or '').strip()
        if addr:
            recipients.append({'emailAddress': {'address': addr}})
    return recipients


def _build_attachments(attachments):
    graph_attachments = []
    for att in attachments or []:
        content = att.get('content')
        if content is None:
            continue
        if isinstance(content, str):
            content = content.encode('utf-8')
        graph_attachments.append({
            '@odata.type': '#microsoft.graph.fileAttachment',
            'name': att.get('name') or 'attachment',
            'contentType': att.get('content_type') or 'application/octet-stream',
            'contentBytes': base64.b64encode(content).decode('ascii'),
        })
    return graph_attachments


def list_users(search=None, top=15):
    token = _get_access_token()
    headers = {'Authorization': f'Bearer {token}'}
    params = {
        '$select': 'displayName,mail,userPrincipalName',
        '$top': str(top),
        '$orderby': 'displayName',
    }

    if search:
        safe = search.replace('"', '').replace('\\', '').strip()
        if safe:
            params['$search'] = (
                f'"displayName:{safe}" OR "mail:{safe}" OR "userPrincipalName:{safe}"'
            )
            headers['ConsistencyLevel'] = 'eventual'
            params['$count'] = 'true'
            params.pop('$orderby', None)

    try:
        resp = requests.get(f'{GRAPH_BASE}/users', headers=headers, params=params, timeout=30)
    except requests.RequestException as exc:
        raise GraphMailError(f'Failed to reach Microsoft Graph: {exc}') from exc

    if not resp.ok:
        raise GraphMailError(f'Failed to list tenant users ({resp.status_code}): {resp.text}')

    users = []
    for u in (resp.json() or {}).get('value', []):
        email = u.get('mail') or u.get('userPrincipalName')
        if email:
            users.append({'name': u.get('displayName') or email, 'email': email})
    return users


def send_mail(to_recipients, subject, html_body, attachments=None,
              cc_recipients=None, sender=None, save_to_sent=True):
    sender = sender or Config.MS_GRAPH_SENDER_EMAIL
    if not sender:
        raise GraphMailError('Sender mailbox is not configured (MS_GRAPH_SENDER_EMAIL).')

    to_list = _build_recipients(to_recipients)
    if not to_list:
        raise GraphMailError('At least one valid recipient is required.')

    message = {
        'subject': subject or '(no subject)',
        'body': {'contentType': 'HTML', 'content': html_body or ''},
        'toRecipients': to_list,
    }
    cc_list = _build_recipients(cc_recipients)
    if cc_list:
        message['ccRecipients'] = cc_list

    graph_attachments = _build_attachments(attachments)
    if graph_attachments:
        message['attachments'] = graph_attachments

    token = _get_access_token()
    send_url = f'{GRAPH_BASE}/users/{sender}/sendMail'
    try:
        resp = requests.post(
            send_url,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            json={'message': message, 'saveToSentItems': bool(save_to_sent)},
            timeout=60,
        )
    except requests.RequestException as exc:
        raise GraphMailError(f'Failed to reach Microsoft Graph: {exc}') from exc

    if resp.status_code not in (200, 202):
        raise GraphMailError(f'Microsoft Graph sendMail failed ({resp.status_code}): {resp.text}')
    return True
