import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import path from 'path';
import { getVersionForCollectionItem, satisfies } from './collections/util';
import { getMessages } from './messages';
import type { CollectionMessageTypes } from '@types';

const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();

type Channel = CollectionEntry<'channels'> & {
  catalog: {
    path: string;
    filePath: string;
    type: string;
  };
};

interface Props {
  getAllVersions?: boolean;
}

export const getChannels = async ({ getAllVersions = true }: Props = {}): Promise<Channel[]> => {
  const channels = await getCollection('channels', (query) => {
    return (getAllVersions || !query.slug.includes('versioned')) && query.data.hidden !== true;
  });

  const { commands, events, queries } = await getMessages();
  const allMessages = [...commands, ...events, ...queries];

  return channels.map((channel) => {
    const { latestVersion, versions } = getVersionForCollectionItem(channel, channels);

    const messagesForChannel = allMessages.filter((message) => {
      return message.data.channels?.some((messageChannel) => {
        if (messageChannel.id != channel.data.id) return false;
        if (messageChannel.version == 'latest' || messageChannel.version == undefined)
          return channel.data.version == latestVersion;
        return satisfies(channel.data.version, messageChannel.version);
      });
    });

    const messages = messagesForChannel.map((message: CollectionEntry<CollectionMessageTypes>) => {
      return { id: message.data.id, name: message.data.name, version: message.data.version, collection: message.collection };
    });

    return {
      ...channel,
      data: {
        ...channel.data,
        versions,
        latestVersion,
        messages,
      },
      catalog: {
        path: path.join(channel.collection, channel.id.replace('/index.mdx', '')),
        absoluteFilePath: path.join(PROJECT_DIR, channel.collection, channel.id.replace('/index.mdx', '/index.md')),
        astroContentFilePath: path.join(process.cwd(), 'src', 'content', channel.collection, channel.id),
        filePath: path.join(process.cwd(), 'src', 'catalog-files', channel.collection, channel.id.replace('/index.mdx', '')),
        publicPath: path.join('/generated', channel.collection, channel.id.replace('/index.mdx', '')),
        type: 'event',
      },
    };
  });
};
